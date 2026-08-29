<script setup lang="ts">
import { computed, ref } from "vue";
import {
  blankCommentary,
  draftToEntry,
  emptyDraft,
  hasErrors,
  serializeEntry,
  validateDraft,
  type EntryInput,
} from "../lib/entry.js";
import { ENTRY_TYPES } from "../lib/entryType.js";
import {
  commitEntry,
  ENTRIES_PATH,
  loadToken,
  REPO_NAME,
  REPO_OWNER,
  saveToken,
} from "../lib/github.js";
import { normalizeSeries, seriesLabel } from "../lib/series.js";
import { normalizeTag, suggestTags } from "../lib/tags.js";
import { tryNormalizeUrl } from "../lib/url.js";
import DatePicker from "./DatePicker.vue";
import EntryTypeIcon from "./EntryTypeIcon.vue";

const props = defineProps<{
  knownTags: string[];
  knownSeries: string[];
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
const showError = (field: "title" | "url" | "publishedAt" | "commentary"): string =>
  submitted.value ? (errors.value[field] ?? "") : "";

const duplicate = computed(() => {
  const normalized = tryNormalizeUrl(draft.value.url.trim());
  return normalized !== null && props.existingUrls.includes(normalized);
});

/** The record that would be written — also what the copy-JSON path hands over. */
const preview = computed(() => draftToEntry(draft.value));
const previewJson = computed(() => serializeEntry(preview.value));

/**
 * Series slugs matching what has been typed, offered as chips. A slug has to
 * match an existing one exactly to group with it, so the suggestions are the
 * point of the field — but only once there is something to match: an untouched
 * field listing every series in the data is noise, and most entries are not
 * part of one. `<datalist>` did this natively, but its dropdown is the
 * browser's and cannot be themed. Matching is case-insensitive; the suggestion
 * keeps the curated spelling.
 */
function matching(query: string, known: string[], limit = 6): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return known
    .filter((name) => name.toLowerCase() !== q)
    .filter((name) => name.toLowerCase().includes(q))
    .toSorted((a, b) => {
      const aPrefix = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bPrefix = b.toLowerCase().startsWith(q) ? 0 : 1;
      return aPrefix - bPrefix || a.length - b.length || a.localeCompare(b);
    })
    .slice(0, limit);
}

const seriesSuggestions = computed(() => matching(draft.value.series, props.knownSeries));

/** Tags matching what has been typed so far, offered under the input. */
const tagSuggestions = computed(() =>
  suggestTags(tagInput.value, props.knownTags, draft.value.tags),
);

/** What the slug will become once saved — typing "Storing Messages" still joins the series. */
const seriesSlug = computed(() => normalizeSeries(draft.value.series));
const seriesIsNew = computed(
  () => seriesSlug.value !== "" && !props.knownSeries.includes(seriesSlug.value),
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

/** Keep exactly one blank row at the end, so there is always somewhere to type. */
function ensureBlankCommentary(): void {
  const rows = draft.value.commentary;
  const last = rows.at(-1);
  if (!last || last.source.trim() || last.url.trim()) rows.push(blankCommentary());
}

function removeCommentary(index: number): void {
  draft.value.commentary.splice(index, 1);
  ensureBlankCommentary();
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

        <div class="field">
          <span class="field-label">Type</span>
          <div class="type-toggle">
            <button
              v-for="option in ENTRY_TYPES"
              :key="option.id"
              class="type-option"
              :class="{ active: draft.type === option.id }"
              @click="draft.type = option.id"
            >
              <EntryTypeIcon :type="option.id" :size="15" />
              <span>{{ option.label }}</span>
            </button>
          </div>
        </div>

        <div class="field-row">
          <label class="field">
            <span class="field-label">Company</span>
            <input
              v-model="draft.source"
              type="text"
              autocomplete="off"
              placeholder="Netflix, Figma, Google…"
            />
          </label>

          <label class="field">
            <span class="field-label">Published</span>
            <DatePicker v-model="draft.publishedAt" />
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

        <label class="field">
          <span class="field-label">Series <span class="field-optional">optional</span></span>
          <input
            v-model="draft.series"
            type="text"
            autocomplete="off"
            placeholder="Group sequels under one slug, e.g. discord-message-storage"
          />
          <div v-if="seriesSuggestions.length" class="chip-suggestions">
            <button
              v-for="id in seriesSuggestions"
              :key="id"
              class="tag-chip"
              @click="draft.series = id"
            >
              {{ id }}
            </button>
          </div>
          <span v-if="seriesSlug" class="field-hint">
            Saved as <code>{{ seriesSlug }}</code> — shows as “{{ seriesLabel(seriesSlug) }}”.
            {{ seriesIsNew ? "New series; the card links up once a second part is added." : "" }}
          </span>
        </label>

        <div class="field">
          <span class="field-label"> Commentary <span class="field-optional">optional</span> </span>
          <div v-for="(row, index) in draft.commentary" :key="index" class="commentary-row">
            <div class="type-toggle compact">
              <button
                v-for="option in ENTRY_TYPES"
                :key="option.id"
                class="type-option"
                :class="{ active: (row.type ?? 'article') === option.id }"
                :title="option.label"
                @click="row.type = option.id"
              >
                <EntryTypeIcon :type="option.id" :size="15" />
              </button>
            </div>
            <input
              v-model="row.source"
              class="commentary-source"
              type="text"
              placeholder="Who wrote it"
              @input="ensureBlankCommentary"
            />
            <input
              v-model="row.url"
              class="commentary-url"
              type="url"
              placeholder="https://…"
              @input="ensureBlankCommentary"
            />
            <button
              v-if="draft.commentary.length > 1"
              class="commentary-remove"
              title="Remove this link"
              @click="removeCommentary(index)"
            >
              ✕
            </button>
          </div>
          <span v-if="showError('commentary')" class="field-error">
            {{ showError("commentary") }}
          </span>
          <span v-else class="field-hint">
            Someone else's write-up about this entry — a post, a paper, a video. The card links to
            it by name and type, so use a name you would recognize.
          </span>
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
