import { Route, Routes } from 'react-router';

import ChatFrame from './shared/components/ChatFrame.js';

import ConversationPage from './views/conversation/ConversationPage.js';
import EmptyState from './views/home/EmptyState.js';

/**
 * The chat's addresses: the conversations themselves, and the empty state for
 * both the way in and anything that names no conversation.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<ChatFrame />}>
        <Route index element={<EmptyState />} />
        <Route path="c/:conversationId" element={<ConversationPage />} />
        <Route path="*" element={<EmptyState />} />
      </Route>
    </Routes>
  );
}
