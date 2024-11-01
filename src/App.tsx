import { ReadyState } from 'react-use-websocket';
import './App.css';
import { ThemeProvider } from './theme/ThemeProvider';
import { WsUrlForm } from './websocket/WsUrlForm';
import { usePage } from './usePage';
import { EntitiesInspectorPage } from './entity/EntitiesInspectorPage';
import { useWs } from './websocket/useWs';
import { WebsocketConnector } from './websocket/WebSocketConnector';
import { Layout } from './layout/Layout';
import { WebSocketReconnectOverlay } from './websocket/WebSocketReconnectOverlay';
import { useStore } from './store';
import { Toaster } from './shared/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function App() {
  return (
    <>
      <WebsocketConnector />
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <QueryClientProvider client={queryClient}>
          <WebSocketReconnectOverlay />
          <Layout>
            <RenderedPage />
            <Toaster />
          </Layout>
        </QueryClientProvider>
      </ThemeProvider>
    </>
  );
}

export default App;

function RenderedPage() {
  const { currentPage } = usePage();
  const { readyState } = useWs();
  const hasConnected = useStore((state) => state.hasConnected);
  if (readyState !== ReadyState.OPEN && !hasConnected) {
    return <WsUrlForm />;
  }

  if (currentPage === 'inspector') {
    return <EntitiesInspectorPage />;
  }

  return <>Page not found</>;
}
