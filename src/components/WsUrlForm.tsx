import { useForm } from "react-hook-form";
import { Input } from "./ui/Input";
import { useWs } from "./WebSocket";
import { Button } from "./ui/Button";

export function WsUrlForm() {
  const { register, handleSubmit } = useForm<{ url: string }>({
    defaultValues: {
      url: "ws://localhost:3000",
    },
  });
  const { setUrl } = useWs();
  const onSubmit = (data: { url: string }) => {
    try {
      const url = new URL(data.url);
      const body = { method: "inspector/stream", jsonrpc: "2.0" };
      const ws_url = `ws://${url.host}?body=${encodeURIComponent(JSON.stringify(body))}`;
      setUrl(ws_url);
    } catch {
      alert("Invalid URL");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex gap-x-4">
      <Input {...register("url")}></Input>
      <Button type="submit">Connect</Button>
    </form>
  );
}
