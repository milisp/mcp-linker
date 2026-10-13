import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientIcon } from "@/components/ClientIcon";
import { clientOptions } from "@/constants/clients";
import { useClientPathStore } from "@/stores/clientPathStore";
export function ClientSelector() {
  const { selectedClient, setSelectedClient } = useClientPathStore();

  return (
    <div className="z-50">
      <Select value={selectedClient} onValueChange={setSelectedClient}>
        <SelectTrigger className="h-8 w-full text-xs" aria-label="Target client">
          <SelectValue placeholder="Select a client" />
        </SelectTrigger>
        <SelectContent>
          {clientOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} textValue={option.label}>
              <ClientIcon client={option.value} />
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

