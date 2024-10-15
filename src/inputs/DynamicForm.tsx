import { Form } from '@/shared/ui/form';
import { TypeName } from '@/type-registry/useTypeRegistry';
import { useForm, useFormContext } from 'react-hook-form';
import { DynamicInput } from './DynamicInput';
import { deepStringify } from '@/utils';
import { flattenObject, isPlainObject, uniq } from 'es-toolkit';
import { Check } from 'lucide-react';

export type DynamicFormProps = {
  value: any;
  typeName: TypeName;
};

export function DynamicForm({ typeName, value }: DynamicFormProps) {
  const form = useForm({
    // values: value,
    defaultValues: value,
  });

  const onSubmit = (data: any) => {
    console.log(data);
  };

  if (value === null) {
    return <>form value is null</>;
  }

  if (!isPlainObject(value)) {
    return (
      <div>
        <span>Not object</span>
        <pre>{JSON.stringify(value, null, 2)}</pre>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <DynamicInput
          typeName={typeName}
          value={value}
          parentPath=""
        ></DynamicInput>
        {import.meta.env.DEV && <Debug value={value} />}
      </form>
    </Form>
  );
}

function Debug({ value }: { value: any }) {
  const ctx = useFormContext();
  const formValues = ctx.watch();
  const valueFields = Object.keys(flattenObject(value)).sort();
  const jsonValueFields = deepStringify(valueFields);

  const formFields = uniq(
    Object.keys(flattenObject(ctx.control._fields))
      .map((f) => f.split('._f')[0])
      .sort()
  );
  const jsonFormFields = deepStringify(formFields);

  return (
    <div className="bg-black mt-2">
      {jsonValueFields === jsonFormFields ? (
        <span className="text-green-500 block">Matched</span>
      ) : (
        <span className="text-red-500 block">Not Matched</span>
      )}
      <div className="grid grid-cols-4">
        <div>
          <span>FormFields</span>
          {formFields.map((f) => (
            <div key={f} className="flex">
              <span className="break-all hyphens-auto">{f}</span>
              {valueFields.includes(f) ? (
                <span className="text-green-500">
                  <Check />
                </span>
              ) : (
                <span>❌</span>
              )}
            </div>
          ))}
        </div>
        <div>
          <span>OriginalFields</span>
          {valueFields.map((f) => (
            <div key={f} className="flex">
              <span className="break-all">{f}</span>
              {formFields.includes(f) ? (
                <span className="text-green-500">
                  <Check />
                </span>
              ) : (
                <span>❌</span>
              )}
            </div>
          ))}
        </div>
        <div>
          <span>Values</span>
          <pre>{`${deepStringify(value, 2)}`}</pre>
        </div>
        <div>
          <span>FormValues</span>
          <pre>{`${deepStringify(formValues, 2)}`}</pre>
        </div>
      </div>
    </div>
  );
}
