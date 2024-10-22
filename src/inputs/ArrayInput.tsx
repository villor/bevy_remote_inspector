import { TArray, useTypeRegistry } from '@/type-registry/useTypeRegistry';
import { useDynamicForm } from './DynamicForm';
import { DynamicInput } from './DynamicInput';
import { Button } from '@/shared/ui/button';
import { resolveTypeDefaultValue } from '@/type-registry/types';
import { toast } from '@/hooks/use-toast';

export type ArrayInputProps = { typeInfo: TArray; path: string };
export function ArrayInput({ path, typeInfo }: ArrayInputProps) {
  const { getValue, setValue } = useDynamicForm();

  const value = getValue(path);
  const registry = useTypeRegistry();
  if (!Array.isArray(value)) {
    throw new Error(`Value is not an array for ${path}`);
  }

  const onAddItem = () => {
    const newPath = `${path}.${value.length}`;
    const itemValue = resolveTypeDefaultValue(typeInfo.item, registry);
    if (itemValue === undefined) {
      toast({
        variant: 'destructive',
        description: `Cannot resolve default value for ${typeInfo.item}`,
      });
    }
    setValue(newPath, itemValue);
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[auto_1fr] items-center gap-4">
        {value.map((_, i) => {
          const newPath = `${path}.${i}`;
          return (
            <>
              <span>{i}</span>
              <DynamicInput
                key={i}
                typeName={typeInfo.item}
                path={newPath}
              ></DynamicInput>
            </>
          );
        })}
      </div>
      {typeInfo.capacity === null && (
        <Button onClick={onAddItem} type="button">
          Add new item
        </Button>
      )}
    </div>
  );
}
