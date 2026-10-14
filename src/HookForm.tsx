import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { DevTool } from "@hookform/devtools";
import { useRenderCount, RenderCount, type SignUpValues } from "./shared";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, error, ...props }, ref) {
  const renders = useRenderCount();
  return (
    <label className="field">
      {label}
      <RenderCount n={renders} />
      <input ref={ref} {...props} aria-invalid={Boolean(error)} />
      {error && <span className="error">{error}</span>}
    </label>
  );
});

export default function HookForm() {
  const renders = useRenderCount();
  const [result, setResult] = useState<SignUpValues | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({ defaultValues: { name: "", email: "", password: "" } });

  const onSubmit: SubmitHandler<SignUpValues> = (data) => setResult(data);

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <p>
          Form component
          <RenderCount n={renders} />
        </p>
        <Field
          label="Name"
          error={errors.name?.message}
          {...register("name", { required: "Name is required" })}
        />
        <Field
          label="Email"
          error={errors.email?.message}
          {...register("email", {
            required: "Enter a valid email",
            pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" },
          })}
        />
        <Field
          label="Password"
          type="password"
          error={errors.password?.message}
          {...register("password", {
            required: "Use at least 8 characters",
            minLength: { value: 8, message: "Use at least 8 characters" },
          })}
        />
        <button type="submit">Create account</button>
        {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
      </form>
      <DevTool control={control} />
    </>
  );
}
