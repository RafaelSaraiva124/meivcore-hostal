"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  DefaultValues,
  SubmitHandler,
  useForm,
  FieldValues,
  Path,
} from "react-hook-form";
import { z, ZodType } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
        title: "Success",
        description: "You have successfully signed in",
      });

      router.push("/");
    } else {
      toast({
        title: `Error ${isSignIN ? "Signing In" : "Signing Up"}`,
        description: result.error ?? "An error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-white">
        {isSignIN ? "Welcome Back to Hostal Meivcore" : "Create an Account"}
      </h1>
      <p className="text-light-100">
        {isSignIN
          ? "Access Hostal Meivcore Platform"
          : "Please complete all the fields!"}
      </p>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 w-full"
        >
          {Object.keys(defaultValues).map((field) => (
            <FormField
              key={field}
              control={form.control}
              name={field as Path<T>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="capitalize">
                    {FIELD_NAMES[field.name as keyof typeof FIELD_NAMES]}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="shadcn" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <Button type="submit" className="form-btn text-white">
            {isSignIN ? "Entrar" : "Criar Conta"}
          </Button>{" "}
        </form>
      </Form>
    </div>
  );
};
export default AuthForm;
