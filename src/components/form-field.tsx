import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  multiline?: boolean;
  errors?: string[];
  autoFocus?: boolean;
  className?: string; // passed to the input/textarea
};

// A labeled input/textarea that shows field errors from an ActionResult.
export function FormField({
  name,
  label,
  defaultValue,
  required,
  multiline,
  errors,
  autoFocus,
  className,
}: Props) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const shared = {
    id,
    name,
    defaultValue: defaultValue ?? "",
    required,
    autoFocus,
    className,
    "aria-invalid": errors?.length ? true : undefined,
    "aria-describedby": errors?.length ? errorId : undefined,
  };

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? <Textarea rows={3} {...shared} /> : <Input {...shared} />}
      {errors?.length ? (
        <p id={errorId} className="text-xs text-destructive">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
