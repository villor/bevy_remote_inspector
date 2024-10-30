import { useForm } from 'react-hook-form';
import { Input } from '../shared/ui/input';
import { Button } from '../shared/ui/button';
import { useWs } from '@/websocket/useWs';
import { parseWsURL } from './createWsSlice';
import { useStore } from '@/store';
import { ReadyState } from 'react-use-websocket';
import { useToast } from '@/shared/hooks/use-toast';

export function WsUrlForm() {
  const { url, readyState } = useWs();
  const isManuallyConnect = useStore((state) => state.isManuallyConnect);
  const { register, handleSubmit } = useForm<{ url: string }>({
    defaultValues: {
      url,
    },
  });

  const { toast } = useToast();
  const onSubmit = (data: { url: string }) => {
    const url = parseWsURL(data.url);
    if (url) {
      useStore.setState({
        isManuallyConnect: true,
        shouldReconnect: true,
        url,
      });
    } else {
      toast({
        title: 'Invalid URL',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 pt-20">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-grow flex-col gap-y-4 ">
        <Input {...register('url')} className="h-10 px-4 py-3"></Input>
        <Button
          type="submit"
          size="lg"
          isDisabled={readyState === ReadyState.CONNECTING && isManuallyConnect}
        >
          {readyState === ReadyState.CONNECTING && isManuallyConnect ? 'Connecting...' : 'Connect'}
        </Button>
      </form>
    </div>
  );
}
