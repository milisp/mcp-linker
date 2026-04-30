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
import { ServerConfig } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

export const sseFormSchema = z.object({
  url: z.string().min(1, "URL is required"),
  headersJson: z.string().optional(),
});

interface SSEFormProps {
  config: ServerConfig;
  onSubmit: (values: ServerConfig) => void;
  buttonName: string;
}

export function SSEForm({ config, onSubmit, buttonName }: SSEFormProps) {
  const { t } = useTranslation();

  const form = useForm({
    resolver: zodResolver(sseFormSchema),
    defaultValues: {
      url: "url" in config ? config.url : "",
      headersJson:
        "headers" in config && config.headers
          ? JSON.stringify(config.headers, null, 2)
          : "{}",
    },
  });

  function handleSubmit(values: any) {
    let headers = {};
    try {
      headers = values.headersJson ? JSON.parse(values.headersJson) : {};
    } catch (e) {
      console.error("Invalid JSON in headers", e);
    }

    const updatedConfig = {
      ...config,
      url: values.url,
      headers: headers,
    };

    onSubmit(updatedConfig);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("serverForm.url")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="headersJson"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("serverForm.headers")}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder='{"Authorization": "Bearer token"}'
                  value={
                    typeof field.value === "string"
                      ? field.value
                      : JSON.stringify(field.value, null, 2)
                  }
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto">
          {buttonName}
        </Button>
      </form>
    </Form>
  );
}
