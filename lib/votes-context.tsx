"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useVotes } from "@/lib/use-votes";
import { useToast } from "../app/components/Toast";

type Ctx = ReturnType<typeof useVotes>;
const VotesContext = createContext<Ctx | null>(null);

export function VotesProvider({ children }: { children: ReactNode }) {
    const votes = useVotes();
    const toast = useToast();

    useEffect(() => {
        if (votes.error) toast.error(votes.error);
    }, [votes.error, toast]);

    return <VotesContext.Provider value={votes}>{children}</VotesContext.Provider>;
}

export function useSharedVotes(): Ctx {
    const ctx = useContext(VotesContext);
    if (!ctx) throw new Error("VotesProvider eksik");
    return ctx;
}