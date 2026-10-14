import { useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes } from "react";
import { useRenderCount, RenderCount, type SignUpValues } from "./shared";

type Errors = Partial<Record<keyof SignUpValues, string>>;

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

function validate(values: SignUpValues): Errors {
  const errors: Errors = {};
  if (!values.name) errors.name = "Name is required";
  if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "Enter a valid email";
  if (values.password.length < 8) errors.password = "Use at least 8 characters";
  return errors;
}

function Field({ label, error, ...props }: FieldProps) {
  const renders = useRenderCount();
  return (
    <label className="field">
      {label}
      <RenderCount n={renders} />
      <input {...props} aria-invalid={Boolean(error)} />
      {error && <span className="error">{error}</span>}
    </label>
  );
}

export default function StateForm() {
  const renders = useRenderCount();
  const [values, setValues] = useState<SignUpValues>({ name: "", email: "", password: "" });
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SignUpValues | null>(null);

  const errors = submitted ? validate(values) : {};

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name as keyof SignUpValues;
    const value = e.target.value;
    setValues((v) => ({ ...v, [name]: value }));
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate(values)).length === 0) setResult(values);
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <p>
        Form component
        <RenderCount n={renders} />
      </p>
      <Field label="Name" name="name" value={values.name} onChange={onChange} error={errors.name} />
      <Field label="Email" name="email" value={values.email} onChange={onChange} error={errors.email} />
      <Field label="Password" name="password" type="password" value={values.password} onChange={onChange} error={errors.password} />
      <button type="submit">Create account</button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </form>
  );
}
