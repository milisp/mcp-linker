import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ServerConfig, StdioServerConfig } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { SSEForm } from "./sse-form";

const envSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
});

const stdioFormSchema = z.object({
  command: z.string().min(1, "Command is required"),
  args: z.string(),
  env: z.array(envSchema).optional(),
});

interface ServerFormProps {
  config: ServerConfig;
  onSubmit: (values: ServerConfig) => void;
  buttonName: string;
}

export function ServerForm({ config, onSubmit, buttonName }: ServerFormProps) {
  const { t } = useTranslation();

  // Check if this is a StdioServerConfig by checking for command property
  const isStdio = "command" in config;

  // If it's not a stdio server, use the SSEForm component
  if (!isStdio) {
    return (
      <SSEForm config={config} onSubmit={onSubmit} buttonName={buttonName} />
    );
  }

  const envArray = (config as StdioServerConfig).env
    ? Object.entries((config as StdioServerConfig).env!).map(
        ([key, value]) => ({
          key,
          value: String(value),
        }),
      )
    : [];

  const form = useForm({
    resolver: zodResolver(stdioFormSchema),
    defaultValues: {
      command: (config as StdioServerConfig).command || "",
      args: (config as StdioServerConfig).args?.join(" ") || "",
      env: envArray,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "env",
  });

  function handleSubmit(values: any) {
    const envRecord = values.env?.reduce(
      (acc: Record<string, string>, item: { key: string; value: string }) => {
        acc[item.key] = item.value;
        return acc;
      },
      {},
    );

    const updatedConfig = {
      ...config,
      command: values.command,
      args: values.args.split(" ").filter(Boolean),
      env: envRecord,
    } as StdioServerConfig;

    onSubmit(updatedConfig);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="command"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("serverForm.command")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="args"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("serverForm.arguments")}</FormLabel>
              <FormControl>
                <Textarea
                  className="w-full rounded-md shadow-sm focus:ring focus:ring-ring/50 border-input"
                  {...field}
                  placeholder="space-separated args"
                ></Textarea>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <FormLabel>{t("serverForm.env")}</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ key: "", value: "" })}
            >
              {t("serverForm.addEnv")}
            </Button>
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <FormField
                control={form.control}
                name={`env.${index}.key`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`env.${index}.value`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Value" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                className="text-destructive hover:text-destructive/80"
              >
                ×
              </Button>
            </div>
          ))}
        </div>
        <Button type="submit" className="w-full sm:w-auto">
          {buttonName}
        </Button>
      </form>
    </Form>
  );
}
