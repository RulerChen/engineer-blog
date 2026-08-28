<script setup lang="ts">
import { computed, ref } from "vue";
import {
  draftToEntry,
  emptyDraft,
  hasErrors,
  serializeEntry,
  validateDraft,
  type EntryInput,
} from "../lib/entry.js";
import {
  commitEntry,
  ENTRIES_PATH,
  loadToken,
  REPO_NAME,
  REPO_OWNER,
  saveToken,
} from "../lib/github.js";
import { normalizeTag, suggestTags } from "../lib/tags.js";
import { tryNormalizeUrl } from "../lib/url.js";

const props = defineProps<{
  knownSources: string[];
  knownTags: string[];
  existingUrls: string[];
}>();
const emit = defineEmits<{ close: []; added: [entry: EntryInput] }>();

const draft = ref(emptyDraft());
const submitted = ref(false);
const tagInput = ref("");

const token = ref(loadToken());
const showToken = ref(false);
const busy = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const commitUrl = ref("");
const copied = ref(false);

const errors = computed(() => validateDraft(draft.value));
const showError = (field: "title" | "url" | "publishedAt"): string =>
  submitted.value ? (errors.value[field] ?? "") : "";

const duplicate = computed(() => {
  const normalized = tryNormalizeUrl(draft.value.url.trim());
  return normalized !== null && props.existingUrls.includes(normalized);
});

/** The record that would be written — also what the copy-JSON path hands over. */
const preview = computed(() => draftToEntry(draft.value));
const previewJson = computed(() => serializeEntry(preview.value));

/** Tags matching what has been typed so far, offered under the input. */
const tagSuggestions = computed(() =>
  suggestTags(tagInput.value, props.knownTags, draft.value.tags),
);

/** True once the typed tag is new — the input itself becomes the "add this" option. */
const typedTagIsNew = computed(() => {
  const clean = normalizeTag(tagInput.value);
  return clean !== "" && !draft.value.tags.includes(clean) && !props.knownTags.includes(clean);
});

function addTag(tag: string): void {
  const clean = normalizeTag(tag);
  if (clean && !draft.value.tags.includes(clean)) draft.value.tags.push(clean);
  tagInput.value = "";
}

function removeTag(tag: string): void {
  draft.value.tags = draft.value.tags.filter((t) => t !== tag);
}

function reset(): void {
  draft.value = emptyDraft();
  submitted.value = false;
  tagInput.value = "";
  errorMessage.value = "";
  copied.value = false;
}

/** Shared gate for both submit paths: mark as submitted so errors show, then validate. */
function ready(): boolean {
  submitted.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  commitUrl.value = "";
  return !hasErrors(errors.value);
}

async function onCommit(): Promise<void> {
  if (!ready()) return;
  if (!token.value.trim()) {
    showToken.value = true;
    errorMessage.value = "Add a GitHub token first, or use Copy JSON and paste it by hand.";
    return;
  }
  busy.value = true;
  try {
    const entry = preview.value;
    commitUrl.value = await commitEntry(entry);
    successMessage.value = "Committed. The site rebuilds and picks it up in about a minute.";
    emit("added", entry);
    reset();
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : "Commit failed.";
  } finally {
    busy.value = false;
  }
}

async function onCopy(): Promise<void> {
  if (!ready()) return;
  try {
    await navigator.clipboard.writeText(previewJson.value);
    copied.value = true;
    successMessage.value = `Copied. Paste it into the ${ENTRIES_PATH} array and commit.`;
  } catch {
    errorMessage.value = "Couldn't reach the clipboard — select the JSON below and copy it.";
  }
}

function onSaveToken(): void {
  saveToken(token.value.trim());
  showToken.value = false;
  errorMessage.value = "";
}

function onClearToken(): void {
  token.value = "";
  saveToken("");
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Add entry">
      <header class="modal-header">
        <h2 class="heading-font">Add entry</h2>
        <button class="modal-close" title="Close" @click="emit('close')">✕</button>
      </header>

      <div class="modal-body">
        <label class="field">
          <span class="field-label">Title</span>
          <input v-model="draft.title" type="text" placeholder="What is it called?" />
          <span v-if="showError('title')" class="field-error">{{ showError("title") }}</span>
        </label>

        <label class="field">
          <span class="field-label">URL</span>
          <input v-model="draft.url" type="url" placeholder="https://…" />
          <span v-if="showError('url')" class="field-error">{{ showError("url") }}</span>
          <span v-else-if="duplicate" class="field-warning">
            This URL is already in the list — committing will overwrite that entry.
          </span>
        </label>

        <div class="field-row">
          <label class="field">
            <span class="field-label">Company</span>
            <input
              v-model="draft.source"
              type="text"
              list="known-sources"
              placeholder="Netflix, Figma, Google…"
            />
            <datalist id="known-sources">
              <option v-for="name in props.knownSources" :key="name" :value="name"></option>
            </datalist>
          </label>

          <label class="field">
            <span class="field-label">Published</span>
            <input v-model="draft.publishedAt" type="date" />
            <span v-if="showError('publishedAt')" class="field-error">
              {{ showError("publishedAt") }}
            </span>
          </label>
        </div>

        <div class="field">
          <span class="field-label">Tags</span>
          <div v-if="draft.tags.length" class="tag-chips">
            <button
              v-for="tag in draft.tags"
              :key="tag"
              class="tag-chip selected"
              :title="`Remove ${tag}`"
              @click="removeTag(tag)"
            >
              {{ tag }} <span class="tag-x">✕</span>
            </button>
          </div>
          <input
            v-model="tagInput"
            type="text"
            placeholder="Type any tag, press Enter to add"
            @keydown.enter.prevent="addTag(tagInput)"
          />
          <div v-if="tagSuggestions.length || typedTagIsNew" class="tag-suggestions">
            <button v-if="typedTagIsNew" class="tag-chip new" @click="addTag(tagInput)">
              + {{ normalizeTag(tagInput) }}
            </button>
            <button v-for="tag in tagSuggestions" :key="tag" class="tag-chip" @click="addTag(tag)">
              {{ tag }}
            </button>
          </div>
        </div>

        <details class="token-panel" :open="showToken">
          <summary>GitHub token {{ token ? "· saved" : "· not set" }}</summary>
          <p class="token-hint">
            A fine-grained token with <strong>Contents: read and write</strong> on
            {{ REPO_OWNER }}/{{ REPO_NAME }}, used to commit {{ ENTRIES_PATH }} directly. It is
            stored in this browser's localStorage only — if you'd rather not keep one here, use Copy
            JSON instead.
          </p>
          <div class="token-row">
            <input v-model="token" type="password" placeholder="github_pat_…" />
            <button class="btn-secondary" @click="onSaveToken">Save</button>
            <button v-if="token" class="btn-secondary" @click="onClearToken">Clear</button>
          </div>
        </details>

        <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
        <p v-if="successMessage" class="form-success">
          {{ successMessage }}
          <a v-if="commitUrl" :href="commitUrl" target="_blank" rel="noopener noreferrer">
            View commit
          </a>
        </p>

        <details class="json-preview">
          <summary>JSON preview</summary>
          <pre>{{ previewJson }}</pre>
        </details>
      </div>

      <footer class="modal-footer">
        <button class="btn-secondary" :disabled="busy" @click="onCopy">
          {{ copied ? "Copied ✓" : "Copy JSON" }}
        </button>
        <button class="btn-primary" :disabled="busy" @click="onCommit">
          {{ busy ? "Committing…" : "Commit to GitHub" }}
        </button>
      </footer>
    </div>
  </div>
</template>
