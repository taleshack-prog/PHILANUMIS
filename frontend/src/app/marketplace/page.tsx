import Link from "next/link";

/// TODO: esta página precisa de uma fonte de dados que liste todos os `tokenId`s existentes.
/// Ler isso direto da chain (iterando `tokenCounter`) funciona para o MVP, mas não escala e não
/// permite filtrar/buscar. Recomendo indexação via um subgraph (The Graph) ou um indexer próprio
/// (ponkio, ou um cron simples gravando em Postgres a partir dos eventos `AssetCreated`).
export default function MarketplacePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-lg font-medium">Marketplace</h1>
      <p className="mt-2 text-sm text-gray-600">
        Listagem de ativos pendente de indexação — ver TODO no código desta página. Por enquanto,
        acesse um ativo diretamente pela URL:
      </p>
      <Link href="/marketplace/1" className="mt-4 inline-block text-sm underline">
        Ver ativo #1 (exemplo)
      </Link>
    </main>
  );
}
