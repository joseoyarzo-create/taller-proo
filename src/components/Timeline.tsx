import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageSquare, Phone } from 'lucide-react';

interface TimelineItemProps {
  item: {
    id: string;
    fecha: string;
    tipo: string;
    resultado: string;
  };
}

const TimelineItem = ({ item }: TimelineItemProps) => {
  const getIcon = () => {
    switch (item.tipo) {
      case 'whatsapp':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case 'llamada':
        return <Phone className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-start space-x-4 py-4">
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-grow">
        <div className="flex items-center justify-between">
          <p className="font-semibold capitalize">
            {item.tipo}: {item.resultado}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(item.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
          </p>
        </div>
      </div>
    </div>
  );
};

interface TimelineProps {
  items: TimelineItemProps['item'][];
}

const Timeline = ({ items }: TimelineProps) => {
  if (items.length === 0) {
    return <p className="text-center text-muted-foreground py-4">No hay historial de comunicación.</p>;
  }

  return (
    <div className="divide-y">
      {items.map((item) => (
        <TimelineItem key={item.id} item={item} />
      ))}
    </div>
  );
};

export default Timeline;
