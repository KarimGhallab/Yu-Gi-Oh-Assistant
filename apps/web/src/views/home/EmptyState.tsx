/**
 * What the chat shows when no conversation is open. Starting one creates it, so
 * arriving here never leaves an empty conversation behind in the sidebar.
 */
export default function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-xl font-semibold text-neutral-100">
        Start a conversation
      </h1>
      <p className="max-w-md text-sm text-neutral-400">
        Your conversations are listed in the sidebar. Start a new one and ask
        for the cards you are looking for.
      </p>
    </div>
  );
}
