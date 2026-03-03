import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useLocation } from "wouter";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  
  // Format title based on route
  const getTitle = () => {
    if (location === "/") return "Dashboard";
    if (location === "/upload") return "Upload Documents";
    if (location.startsWith("/documents/")) return "Document Review";
    if (location.startsWith("/admin/schemas")) return "Document Schemas";
    if (location.startsWith("/admin/settings")) return "Organization Settings";
    if (location.startsWith("/audit")) return "Audit Log";
    return "DocuIntel";
  };

  return (
    <SidebarProvider style={{ "--sidebar-width": "17rem", "--sidebar-width-icon": "4rem" } as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border/50 bg-card/50 backdrop-blur-md px-6 z-10">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="h-4 w-px bg-border mx-2"></div>
            <h1 className="text-lg font-semibold font-display tracking-tight text-foreground">{getTitle()}</h1>
          </header>
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
