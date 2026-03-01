import ResultsClient from "./ResultsClient";

// Required for Next.js static export (output: 'export') with dynamic [id] route.
// We generate a single placeholder page. At runtime, firebase.json rewrites
// serve index.html for all paths, and the client-side router resolves the ID.
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function ResultsPage() {
  return <ResultsClient />;
}
