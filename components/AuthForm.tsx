"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  DefaultValues,
  SubmitHandler,
  useForm,
  FieldValues,
  Path,
} from "react-hook-form";
import { ZodType } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { FIELD_NAMES } from "@/constants";

interface Props<T extends FieldValues> {
  schema: ZodType<T>;
  defaultValues: T;
  onSubmit: (data: T) => Promise<{ success: boolean; error?: string }>;
  type: "SIGN_IN" | "SIGN_UP";
}

const AuthForm = <T extends FieldValues>({
  type,
  schema,
  defaultValues,
  onSubmit,
}: Props<T>) => {
  const router = useRouter();
  const isSignIN = type === "SIGN_IN";
  const form = useForm({
    resolver: zodResolver(schema as any),
    defaultValues: defaultValues as DefaultValues<T>,
  });

  const handleSubmit: SubmitHandler<T> = async (data) => {
    const result = await onSubmit(data);
    if (result.success) {
      toast({
        title: "Éxito",
        description: isSignIN
          ? "Has iniciado sesión correctamente"
          : "Tu cuenta ha sido creada con éxito",
      });

      router.push("/");
    } else {
      toast({
        title: "Error",
        description: result.error ?? "Ha ocurrido un error.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto bg-white shadow-md rounded-xl p-6">
      <h1 className="text-2xl font-bold text-center text-gray-800">
        {isSignIN
          ? "Bienvenido de nuevo a Hostal Meivcore"
          : "Crear una cuenta"}
      </h1>
      <p className="text-center text-gray-500 text-sm">
        {isSignIN
          ? "Accede a la plataforma de Hostal Meivcore"
          : "Por favor completa todos los campos"}
      </p>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-5 w-full"
        >
          {Object.keys(defaultValues).map((field) => (
            <FormField
              key={field}
              control={form.control}
              name={field as Path<T>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="capitalize text-gray-700">
                    {FIELD_NAMES[field.name as keyof typeof FIELD_NAMES]}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={`Introduce tu ${FIELD_NAMES[field.name as keyof typeof FIELD_NAMES]}`}
                      {...field}
                      className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 text-sm" />
                </FormItem>
              )}
            />
          ))}

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
          >
            {isSignIN ? "Iniciar Sesión" : "Crear Cuenta"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default AuthForm;
