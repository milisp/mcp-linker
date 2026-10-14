import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientIcon } from "@/components/ClientIcon";
import { getClients } from "@/lib/clients";
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
          {getClients().map((client) => (
            <SelectItem key={client.id} value={client.id} textValue={client.label}>
              <ClientIcon client={client.id} />
              {client.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

