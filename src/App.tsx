import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import ChatView from "@/pages/ChatView";
import SessionView from "@/pages/SessionView";
import LibraryView from "@/pages/LibraryView";
import PreferencesView from "@/pages/PreferencesView";
import ProfilesView from "@/pages/ProfilesView";
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
            <Route path="/session" element={<SessionView />} />
            <Route path="/library" element={<LibraryView />} />
            <Route path="/preferences" element={<PreferencesView />} />
            <Route path="/profiles" element={<ProfilesView />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
