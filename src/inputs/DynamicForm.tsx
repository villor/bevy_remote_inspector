import { type TValue, type TypeName, useTypeRegistry } from '@/type-registry/useTypeRegistry';
import { type Control, useForm, type UseFormReturn } from 'react-hook-form';
import { getInputComponent } from './DynamicInput';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

export type DynamicFormProps = {
  value: any;
  typeName: TypeName;
  onChange: (value: any) => void;
  allowUndefined?: boolean;
  readOnly?: boolean;
};

export type DynamicFormContext = Pick<UseFormReturn, 'unregister'> & {
  setValue(name: string, value: any): void;
  getValue<T extends TValue = TValue>(name?: string): T;
  allowUndefined: boolean;
  readOnly: boolean;
  control: Control<any>;
};
const Context = createContext({} as DynamicFormContext);

export function useDynamicForm() {
  return useContext(Context);
}

const ROOT_KEY = '__root__';

export function DynamicForm(props: DynamicFormProps) {
  const [readOnly, setReadOnly] = useState(props.readOnly ?? false);
  const [renderErrorMessage, setRenderErrorMessage] = useState<null | string>();
  return (
    <ErrorBoundary
      fallback={
        <span className="text-red-500">{`Unable to render ${props.typeName}. Error: ${renderErrorMessage}`}</span>
      }
      onError={(error) => {
        setReadOnly(true);
        setRenderErrorMessage(error.message);
      }}
      onReset={() => {
        setReadOnly(false);
        setRenderErrorMessage(null);
      }}
    >
      <DynamicFormInner {...props} readOnly={readOnly} />
    </ErrorBoundary>
  );
}
function DynamicFormInner({
  typeName,
  value,
  onChange,
  readOnly,
  allowUndefined = false,
}: DynamicFormProps & { readOnly: boolean }) {
  const {
    setValue: rhfSetValue,
    unregister,
    getValues,
    control,
  } = useForm<any>({
    values: {
      [ROOT_KEY]: value,
    },
    defaultValues: {
      [ROOT_KEY]: value,
    },
  });

  const setValue = useCallback(
    (name: string, value: any) => {
      rhfSetValue(name, value);
      onChange(getValues()[ROOT_KEY]);
    },
    [onChange, getValues],
  );

  const getValue: DynamicFormContext['getValue'] = useCallback(
    (name: string) => {
      return getValues(name);
    },
    [getValues],
  );

  const ctx: DynamicFormContext = useMemo(() => {
    return {
      setValue,
      unregister,
      getValue,
      readOnly,
      allowUndefined,
      control,
    };
  }, [unregister, setValue, getValue, readOnly, allowUndefined, control]);
  const registry = useTypeRegistry();
  return (
    <Context.Provider value={ctx}>
      {getInputComponent({ path: ROOT_KEY, typeName, registry })}
      {/* {import.meta.env.DEV && <Debug value={{ [ROOT_KEY]: value }} />} */}
    </Context.Provider>
  );
}

// function Debug({ value }: { value: any }) {
//   const { getValue } = useContext(Context);
//   const valueFields = Object.keys(flattenObject(value)).sort();
//   const jsonValueFields = deepStringify(valueFields);
//   const formFields = Object.keys(
//     flattenObject(getValue() as TValueObject)
//   ).sort();
//   const jsonFormFields = deepStringify(formFields);

//   return (
//     <div className="bg-black mt-2">
//       {jsonValueFields === jsonFormFields ? (
//         <span className="text-green-500 block">Matched</span>
//       ) : (
//         <span className="text-red-500 block">Not Matched</span>
//       )}
//       <div className="grid grid-cols-4">
//         <div>
//           <span>FormFields</span>
//           {formFields.map((f) => (
//             <div key={f} className="flex">
//               <span className="break-all hyphens-auto">{f}</span>
//               {valueFields.includes(f) ? (
//                 <span className="text-green-500">
//                   <Check />
//                 </span>
//               ) : (
//                 <span>❌</span>
//               )}
//             </div>
//           ))}
//         </div>
//         <div>
//           <span>OriginalFields</span>
//           {valueFields.map((f) => (
//             <div key={f} className="flex">
//               <span className="break-all">{f}</span>
//               {formFields.includes(f) ? (
//                 <span className="text-green-500">
//                   <Check />
//                 </span>
//               ) : (
//                 <span>❌</span>
//               )}
//             </div>
//           ))}
//         </div>
//         <div>
//           <span>Values</span>
//           <pre>{`${deepStringify(value, 2)}`}</pre>
//         </div>
//         <div>
//           <span>FormValues</span>
//           <pre>{`${deepStringify(getValue(), 2)}`}</pre>
//         </div>
//       </div>
//     </div>
//   );
// }
