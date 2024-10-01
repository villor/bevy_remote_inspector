import "./App.css";
import { Layout } from "./components/Layout";
import { TypeRegistryProvider } from "./components/registries/TypeRegistry";
import { WebsocketProvider } from "./components/WebSocket";
import { WsUrlForm } from "./components/WsUrlForm";

function App() {
  return (
    <TypeRegistryProvider>
      <WebsocketProvider>
        <Layout>
          <WsUrlForm />
        </Layout>
      </WebsocketProvider>
    </TypeRegistryProvider>
  );
}

export default App;
