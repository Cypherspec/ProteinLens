import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center fade-up">
        <p className="label-eyebrow mb-4">404 · not found</p>
        <h1 className="display-italic text-5xl text-foreground">Lost in the field</h1>
        <p className="mt-3 text-sm text-taupe">This page isn't part of the specimen book.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all duration-300 hover:bg-sage-deep hover:scale-[1.02]"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ProteinLens: A scientific field guide for protein structures" },
      { name: "description", content: "An interactive, beautifully designed protein structure visualizer. Real RCSB PDB data, AlphaFold support, sequence analysis, and biological intelligencebuilt for scientists and students." },
      { name: "author", content: "ProteinLens" },
      { property: "og:title", content: "ProteinLens: A scientific field guide for protein structures" },
      { property: "og:description", content: "An interactive, beautifully designed protein structure visualizer. Real RCSB PDB data, AlphaFold support, sequence analysis, and biological intelligencebuilt for scientists and students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ProteinLens: A scientific field guide for protein structures" },
      { name: "twitter:description", content: "An interactive, beautifully designed protein structure visualizer. Real RCSB PDB data, AlphaFold support, sequence analysis, and biological intelligencebuilt for scientists and students." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/34835ef9-ca73-4dab-b383-5e8028209b38/id-preview-c39c46c2--17ed46b7-ac27-48f9-9820-d66606e3cc39.lovable.app-1777095956528.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/34835ef9-ca73-4dab-b383-5e8028209b38/id-preview-c39c46c2--17ed46b7-ac27-48f9-9820-d66606e3cc39.lovable.app-1777095956528.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..600&family=DM+Sans:opsz,wght@9..40,300..700&family=DM+Mono:wght@400;500&display=swap",
      },
    ],
    scripts: [
      { src: "https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.4.2/3Dmol-min.js", defer: true },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-card)",
            color: "var(--color-foreground)",
            border: "1px solid var(--color-border-strong)",
            borderLeft: "3px solid var(--color-sage)",
            borderRadius: "12px",
            fontFamily: "var(--font-sans)",
            boxShadow: "var(--shadow-warm-lg)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
