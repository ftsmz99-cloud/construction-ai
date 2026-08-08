import { createContext, useContext, useState } from "react";

type Lead = {
  name: string;
  service: string;
  phone: string;
  status: string;
};


type LeadContextType = {
  leads: Lead[];
  addLead: (lead: Lead) => void;
};


const LeadContext = createContext<LeadContextType | null>(null);


export function LeadProvider({ children }: { children: React.ReactNode }) {

  const [leads, setLeads] = useState<Lead[]>([
    {
      name: "John Smith",
      service: "Electrical repair",
      phone: "0812345678",
      status: "New"
    }
  ]);


  function addLead(lead: Lead) {

    setLeads((currentLeads) => [
      ...currentLeads,
      lead
    ]);

  }


  return (
    <LeadContext.Provider
      value={{
        leads,
        addLead
      }}
    >
      {children}
    </LeadContext.Provider>
  );
}



export function useLeads() {

  const context = useContext(LeadContext);

  if (!context) {
    throw new Error(
      "useLeads must be used inside LeadProvider"
    );
  }

  return context;

}