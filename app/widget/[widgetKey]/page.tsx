import WidgetClient from "./WidgetClient";

type WidgetPageProps = {
  params: Promise<{
    widgetKey: string;
  }>;
};

export default async function WidgetPage({
  params,
}: WidgetPageProps) {
  const { widgetKey } = await params;

  return (
    <main className="min-h-screen bg-transparent">
      <WidgetClient widgetKey={widgetKey} />
    </main>
  );
}