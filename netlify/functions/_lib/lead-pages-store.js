import { getStore } from "@netlify/blobs";

const KEY = "lead-pages.json";

const emptyDoc = () => ({ version: 1, updated_at: null, pages: [] });

export async function loadLeadPagesDocument() {
  try {
    const store = getStore("rko-showcase");
    const doc = await store.get(KEY, { type: "json" });
    if (doc && Array.isArray(doc.pages)) return doc;
    return emptyDoc();
  } catch {
    return emptyDoc();
  }
}

export async function saveLeadPages(pages) {
  const store = getStore("rko-showcase");
  const doc = { version: 1, updated_at: new Date().toISOString(), pages };
  await store.setJSON(KEY, doc);
  return doc;
}
