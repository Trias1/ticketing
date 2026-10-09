type Props = {
  title: string;
  value: number;
};

export default function SummaryCard({ title, value }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border">
      <h2 className="text-gray-600 text-sm mb-2">{title}</h2>
      <p className="text-2xl font-semibold text-blue-600">{value}</p>
    </div>
  );
}