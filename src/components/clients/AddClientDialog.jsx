import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function AddClientDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>Adicionar Cliente</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adicionar Cliente (Em Construção)</DialogTitle>
                </DialogHeader>
                <p>Funcionalidade em desenvolvimento.</p>
            </DialogContent>
        </Dialog>
    );
}
