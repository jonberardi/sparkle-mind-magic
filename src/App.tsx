import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import ChatView from "@/pages/ChatView";
import LibraryView from "@/pages/LibraryView";
import PreferencesView from "@/pages/PreferencesView";
import ProfilesView from "@/pages/ProfilesView";
import SongsListView from "@/pages/SongsListView";
import SongView from "@/pages/SongView";
import LogsView from "@/pages/LogsView";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<ChatView />} />
            <Route path="/songs" element={<SongsListView />} />
            <Route path="/songs/:songId" element={<SongView />} />
            <Route path="/library" element={<LibraryView />} />
            <Route path="/preferences" element={<PreferencesView />} />
            <Route path="/styles" element={<ProfilesView />} />
            <Route path="/profiles" element={<Navigate to="/styles" replace />} />
            <Route path="/logs" element={<LogsView />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
