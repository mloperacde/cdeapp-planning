import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export function LazyImage({
  src,
  alt,
  placeholder,
  width,
  height,
  className,
  onLoad,
  ...props
}) {
  const [imageSrc, setImageSrc] = useState(placeholder || null);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = new Image();
          img.onload = () => {
            setImageSrc(src);
            setIsLoaded(true);
            onLoad?.();
          };
          img.onerror = () => {
            setImageSrc(placeholder || src);
          };
          img.src = src;
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, placeholder, onLoad]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={cn(
        'transition-opacity duration-300',
        !isLoaded && 'opacity-50',
        className
      )}
      {...props}
    />
  );
}