import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { ServerConfig } from "@/types";

const envSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
});

const formSchema = z.object({
  command: z.string().min(1, "Command is required"),
  args: z.string(),
  env: z.array(envSchema).optional(),
  disabled: z.boolean().optional(),
  autoApprove: z.array(z.string()).optional(),
});

interface ServerFormProps {
  config: ServerConfig;
  onSubmit: (values: ServerConfig) => void;
  buttonName: string;
}

export function ServerForm({ config, onSubmit, buttonName }: ServerFormProps) {
  const envArray = config.env
    ? Object.entries(config.env).map(([key, value]) => ({
        key,
        value: String(value),
      }))
    : [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      command: config.command,
      args: config.args?.join(" ") || "",
      env: envArray,
      disabled: config.disabled,
      autoApprove: config.autoApprove || [],
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "env",
  });

  function handleSubmit(values: z.infer<typeof formSchema>) {
    const updatedConfig: ServerConfig = {
      command: values.command,
      args: values.args.split(" ").filter(Boolean),
      env: values.env?.reduce(
        (acc, item) => {
          acc[item.key] = item.value;
          return acc;
        },
        {} as Record<string, string>,
      ),
      disabled: values.disabled,
      autoApprove: values.autoApprove,
    };
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
              <FormLabel className=" dark:text-gray-200">Command</FormLabel>
              <FormControl>
                <Input
                  className={
                    "dark:bg-gray-800 dark:border-gray-500 dark:text-white"
                  }
                  {...field}
                />
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
              <FormLabel className=" dark:text-gray-200">Arguments</FormLabel>
              <FormControl>
                <Input
                  className={
                    "dark:bg-gray-800 dark:border-gray-500 dark:text-white"
                  }
                  {...field}
                  placeholder="space-separated args"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-2">
          <FormLabel className=" dark:text-gray-200">
            Environment Variables
          </FormLabel>
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <FormField
                control={form.control}
                name={`env.${index}.key`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        className={
                          "dark:bg-gray-800 dark:border-gray-500 dark:text-white"
                        }
                        placeholder="Key"
                        {...field}
                      />
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
                      <Input
                        className={
                          "dark:bg-gray-800 dark:border-gray-500 dark:text-white"
                        }
                        placeholder="Value"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
