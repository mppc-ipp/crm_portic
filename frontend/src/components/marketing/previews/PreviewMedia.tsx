type Props = {
  videoUrl?: string;
  imagens: string[];
  className?: string;
  videoClassName?: string;
  imageClassName?: string;
  mostrarIndicadorCarousel?: boolean;
};

export default function PreviewMedia({
  videoUrl,
  imagens,
  className = "",
  videoClassName = "",
  imageClassName = "",
  mostrarIndicadorCarousel = false,
}: Props) {
  if (videoUrl) {
    return (
      <video
        src={videoUrl}
        controls
        className={`w-full object-cover ${videoClassName} ${className}`}
      />
    );
  }

  if (!imagens.length) return null;

  return (
    <div className={`relative ${className}`}>
      <img
        src={imagens[0]}
        alt="Pré-visualização"
        className={`w-full object-cover ${imageClassName}`}
      />
      {mostrarIndicadorCarousel && imagens.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
          {imagens.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-blue-500" : "bg-white/70"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
