import {
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Minus,
    Package,
    Plus,
    RotateCcw,
    X,
} from 'lucide-react';
import {
    useCallback,
    useId,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
    type PointerEvent as ReactPointerEvent,
    type WheelEvent as ReactWheelEvent,
} from 'react';
import { StoreButton } from '@/components/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ProductImageData } from '@/types/product';

export type ProductGalleryProps = {
    images: ProductImageData[];
    productName: string;
    brand?: string;
    className?: string;
};

type Point = {
    x: number;
    y: number;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;
const DOUBLE_TAP_ZOOM = 2.5;
const PAN_KEYBOARD_STEP = 56;
const DOUBLE_TAP_MAX_DELAY_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE_PX = 28;

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function clampOffset(offset: Point, scale: number, stageSize: number): Point {
    if (scale <= 1) {
        return { x: 0, y: 0 };
    }

    const maxPan = Math.max(((scale - 1) * stageSize) / 2, 160);

    return {
        x: clamp(offset.x, -maxPan, maxPan),
        y: clamp(offset.y, -maxPan, maxPan),
    };
}

function buildImageSrcSet(image: ProductImageData): string {
    if (image.zoomUrl && image.zoomUrl !== image.url) {
        return `${image.url} 800w, ${image.zoomUrl} 1600w`;
    }

    return `${image.url} 1x, ${image.zoomUrl || image.url} 2x`;
}

/**
 * Galeria de imagens do produto com lightbox em tela cheia e zoom interativo (item 4.1):
 * - Proporção 1:1 reservada na imagem principal e nas miniaturas para evitar CLS.
 * - Mobile (< lg): imagem principal + faixa horizontal de miniaturas com scroll-snap.
 * - Desktop (>= lg): coluna vertical de miniaturas à esquerda + palco principal 1:1.
 * - Lightbox em tela cheia (Dialog do Radix com foco preso e fechamento por Esc).
 * - Zoom sem dependências externas via Pointer Events, roda do mouse e teclado:
 *   botões +/−/Redefinir, teclas +/−/0/setas/Esc, roda do mouse, clique e arraste (pan),
 *   pinça com 2 dedos e duplo toque no mobile.
 * - Respeita `prefers-reduced-motion`.
 */
export function ProductGallery({
    images,
    productName,
    brand,
    className,
}: ProductGalleryProps) {
    const galleryId = useId();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [scale, setScale] = useState<number>(MIN_ZOOM);
    const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const stageRef = useRef<HTMLDivElement | null>(null);
    const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const activePointersRef = useRef<Map<number, Point>>(new Map());
    const dragLastPointRef = useRef<Point | null>(null);
    const didMoveDuringPointerRef = useRef(false);
    const pinchInitialDistanceRef = useRef<number | null>(null);
    const pinchInitialScaleRef = useRef<number>(MIN_ZOOM);
    const pinchLastMidpointRef = useRef<Point | null>(null);
    const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(
        null,
    );

    const safeIndex =
        images.length > 0 ? clamp(selectedIndex, 0, images.length - 1) : 0;
    const activeImage = images[safeIndex] ?? null;

    const getStageDimension = useCallback((): number => {
        const element = stageRef.current;
        if (!element) {
            return 640;
        }

        return Math.max(element.clientWidth, element.clientHeight, 320);
    }, []);

    const resetZoom = useCallback(() => {
        setScale(MIN_ZOOM);
        setOffset({ x: 0, y: 0 });
        setIsDragging(false);
        activePointersRef.current.clear();
        dragLastPointRef.current = null;
        pinchInitialDistanceRef.current = null;
        pinchLastMidpointRef.current = null;
    }, []);

    const applyZoom = useCallback(
        (nextScaleRaw: number, nextOffset?: Point) => {
            const nextScale = Number(
                clamp(nextScaleRaw, MIN_ZOOM, MAX_ZOOM).toFixed(2),
            );
            setScale(nextScale);
            setOffset((currentOffset) =>
                clampOffset(
                    nextOffset ?? currentOffset,
                    nextScale,
                    getStageDimension(),
                ),
            );
        },
        [getStageDimension],
    );

    const selectImage = useCallback(
        (index: number, focusThumbnail = false) => {
            if (images.length === 0) {
                return;
            }

            const wrappedIndex =
                ((index % images.length) + images.length) % images.length;
            setSelectedIndex(wrappedIndex);
            resetZoom();

            if (focusThumbnail) {
                thumbnailRefs.current[wrappedIndex]?.focus();
            }
        },
        [images.length, resetZoom],
    );

    const handleLightboxOpenChange = useCallback(
        (open: boolean) => {
            setLightboxOpen(open);
            if (!open) {
                resetZoom();
            }
        },
        [resetZoom],
    );

    const handleThumbnailKeyDown = useCallback(
        (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
            if (images.length <= 1) {
                return;
            }

            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                selectImage(index + 1, true);
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                selectImage(index - 1, true);
            } else if (event.key === 'Home') {
                event.preventDefault();
                selectImage(0, true);
            } else if (event.key === 'End') {
                event.preventDefault();
                selectImage(images.length - 1, true);
            }
        },
        [images.length, selectImage],
    );

    const handleLightboxKeyDown = useCallback(
        (event: ReactKeyboardEvent<HTMLDivElement>) => {
            if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                applyZoom(scale + ZOOM_STEP);
                return;
            }

            if (event.key === '-' || event.key === '_') {
                event.preventDefault();
                applyZoom(scale - ZOOM_STEP);
                return;
            }

            if (event.key === '0') {
                event.preventDefault();
                resetZoom();
                return;
            }

            if (scale > MIN_ZOOM) {
                const stageDim = getStageDimension();

                if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setOffset((prev) =>
                        clampOffset(
                            { x: prev.x, y: prev.y + PAN_KEYBOARD_STEP },
                            scale,
                            stageDim,
                        ),
                    );
                    return;
                }

                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setOffset((prev) =>
                        clampOffset(
                            { x: prev.x, y: prev.y - PAN_KEYBOARD_STEP },
                            scale,
                            stageDim,
                        ),
                    );
                    return;
                }

                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    setOffset((prev) =>
                        clampOffset(
                            { x: prev.x + PAN_KEYBOARD_STEP, y: prev.y },
                            scale,
                            stageDim,
                        ),
                    );
                    return;
                }

                if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    setOffset((prev) =>
                        clampOffset(
                            { x: prev.x - PAN_KEYBOARD_STEP, y: prev.y },
                            scale,
                            stageDim,
                        ),
                    );
                    return;
                }
            } else if (images.length > 1) {
                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    selectImage(safeIndex - 1);
                    return;
                }

                if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    selectImage(safeIndex + 1);
                    return;
                }
            }
        },
        [
            applyZoom,
            getStageDimension,
            images.length,
            resetZoom,
            safeIndex,
            scale,
            selectImage,
        ],
    );

    const handleWheel = useCallback(
        (event: ReactWheelEvent<HTMLDivElement>) => {
            event.preventDefault();
            const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
            applyZoom(scale + delta);
        },
        [applyZoom, scale],
    );

    const handlePointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (event.pointerType === 'mouse' && event.button !== 0) {
                return;
            }

            event.currentTarget.setPointerCapture(event.pointerId);
            activePointersRef.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
            });

            if (activePointersRef.current.size === 1) {
                didMoveDuringPointerRef.current = false;
                dragLastPointRef.current = {
                    x: event.clientX,
                    y: event.clientY,
                };
                if (scale > MIN_ZOOM) {
                    setIsDragging(true);
                }
            } else if (activePointersRef.current.size === 2) {
                const points = Array.from(activePointersRef.current.values());
                const p1 = points[0];
                const p2 = points[1];
                if (p1 && p2) {
                    pinchInitialDistanceRef.current = Math.hypot(
                        p2.x - p1.x,
                        p2.y - p1.y,
                    );
                    pinchInitialScaleRef.current = scale;
                    pinchLastMidpointRef.current = {
                        x: (p1.x + p2.x) / 2,
                        y: (p1.y + p2.y) / 2,
                    };
                    didMoveDuringPointerRef.current = true;
                    setIsDragging(true);
                }
            }
        },
        [scale],
    );

    const handlePointerMove = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (!activePointersRef.current.has(event.pointerId)) {
                return;
            }

            activePointersRef.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
            });

            const stageDim = getStageDimension();

            if (activePointersRef.current.size === 2) {
                const points = Array.from(activePointersRef.current.values());
                const p1 = points[0];
                const p2 = points[1];
                const initialDist = pinchInitialDistanceRef.current;

                if (p1 && p2 && initialDist && initialDist > 0) {
                    const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                    const nextScale = Number(
                        clamp(
                            pinchInitialScaleRef.current *
                                (currentDist / initialDist),
                            MIN_ZOOM,
                            MAX_ZOOM,
                        ).toFixed(2),
                    );

                    const midpoint = {
                        x: (p1.x + p2.x) / 2,
                        y: (p1.y + p2.y) / 2,
                    };
                    const prevMidpoint =
                        pinchLastMidpointRef.current ?? midpoint;
                    const deltaX = midpoint.x - prevMidpoint.x;
                    const deltaY = midpoint.y - prevMidpoint.y;
                    pinchLastMidpointRef.current = midpoint;

                    setScale(nextScale);
                    setOffset((prev) =>
                        clampOffset(
                            { x: prev.x + deltaX, y: prev.y + deltaY },
                            nextScale,
                            stageDim,
                        ),
                    );
                }
                return;
            }

            if (
                activePointersRef.current.size === 1 &&
                dragLastPointRef.current
            ) {
                const deltaX = event.clientX - dragLastPointRef.current.x;
                const deltaY = event.clientY - dragLastPointRef.current.y;

                if (Math.hypot(deltaX, deltaY) > 4) {
                    didMoveDuringPointerRef.current = true;
                }

                dragLastPointRef.current = {
                    x: event.clientX,
                    y: event.clientY,
                };

                if (scale > MIN_ZOOM) {
                    setOffset((prev) =>
                        clampOffset(
                            { x: prev.x + deltaX, y: prev.y + deltaY },
                            scale,
                            stageDim,
                        ),
                    );
                }
            }
        },
        [getStageDimension, scale],
    );

    const finishPointerInteraction = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }

            const wasSinglePointer = activePointersRef.current.size === 1;
            activePointersRef.current.delete(event.pointerId);

            if (activePointersRef.current.size < 2) {
                pinchInitialDistanceRef.current = null;
                pinchLastMidpointRef.current = null;
            }

            if (activePointersRef.current.size === 1) {
                const remaining = Array.from(
                    activePointersRef.current.values(),
                )[0];
                if (remaining) {
                    dragLastPointRef.current = remaining;
                }
                return;
            }

            if (activePointersRef.current.size === 0) {
                setIsDragging(false);
                dragLastPointRef.current = null;

                // Detecta duplo toque / duplo clique para alternar zoom (1x <-> 2.5x)
                if (
                    wasSinglePointer &&
                    !didMoveDuringPointerRef.current &&
                    event.type === 'pointerup'
                ) {
                    const now = Date.now();
                    const prevTap = lastTapRef.current;

                    if (
                        prevTap &&
                        now - prevTap.time <= DOUBLE_TAP_MAX_DELAY_MS &&
                        Math.hypot(
                            event.clientX - prevTap.x,
                            event.clientY - prevTap.y,
                        ) <= DOUBLE_TAP_MAX_DISTANCE_PX
                    ) {
                        lastTapRef.current = null;
                        if (scale > MIN_ZOOM) {
                            resetZoom();
                        } else {
                            applyZoom(DOUBLE_TAP_ZOOM);
                        }
                        return;
                    }

                    lastTapRef.current = {
                        time: now,
                        x: event.clientX,
                        y: event.clientY,
                    };
                }
            }
        },
        [applyZoom, resetZoom, scale],
    );

    // Sem imagens: placeholder 1:1 reservado (ícone Package)
    if (!activeImage) {
        return (
            <section
                aria-label={`Imagem de ${productName}`}
                className={cn('w-full', className)}
            >
                <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/40 p-6 text-center text-muted-foreground">
                    <Package
                        className="size-16 stroke-[1.25]"
                        aria-hidden="true"
                    />
                    <div className="flex flex-col gap-1">
                        {brand && (
                            <span className="text-xs font-semibold text-foreground">
                                {brand}
                            </span>
                        )}
                        <span className="text-sm">
                            Imagem ilustrativa indisponível para este item
                        </span>
                    </div>
                </div>
            </section>
        );
    }

    const activeSrcSet = buildImageSrcSet(activeImage);
    const zoomPercentage = Math.round(scale * 100);

    return (
        <section
            aria-label={`Galeria de imagens de ${productName}`}
            className={cn(
                'flex flex-col gap-3 lg:grid lg:grid-cols-[5.25rem_minmax(0,1fr)] lg:items-start lg:gap-4',
                className,
            )}
        >
            {/* Palco principal 1:1 com proporção reservada (evita CLS) */}
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted/40 lg:order-2">
                <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label={`Ampliar imagem ${safeIndex + 1} de ${images.length}: ${activeImage.alt || productName}`}
                    className="group relative block size-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                    <img
                        src={activeImage.url}
                        srcSet={activeSrcSet}
                        sizes="(min-width: 1536px) 640px, (min-width: 1024px) 48vw, 100vw"
                        alt={activeImage.alt || productName}
                        width={800}
                        height={800}
                        decoding="async"
                        className="size-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />

                    <span className="pointer-events-none absolute right-3 bottom-3 inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-background/90 px-3 py-2 text-xs font-semibold text-foreground shadow-xs backdrop-blur-xs transition-colors duration-150 ease-out group-hover:bg-background">
                        <Maximize2 className="size-3.5" aria-hidden="true" />
                        <span>Ampliar e dar zoom</span>
                    </span>
                </button>

                {images.length > 1 && (
                    <>
                        <StoreButton
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => selectImage(safeIndex - 1)}
                            aria-label="Imagem anterior do produto"
                            className="absolute top-1/2 left-2.5 -translate-y-1/2 bg-background/90 backdrop-blur-xs"
                        >
                            <ChevronLeft
                                className="size-5"
                                aria-hidden="true"
                            />
                        </StoreButton>

                        <StoreButton
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => selectImage(safeIndex + 1)}
                            aria-label="Próxima imagem do produto"
                            className="absolute top-1/2 right-2.5 -translate-y-1/2 bg-background/90 backdrop-blur-xs"
                        >
                            <ChevronRight
                                className="size-5"
                                aria-hidden="true"
                            />
                        </StoreButton>
                    </>
                )}
            </div>

            {/* Miniaturas: carrossel horizontal com scroll-snap no mobile (< lg), coluna lateral no desktop (>= lg) */}
            {images.length > 1 && (
                <div
                    role="group"
                    aria-label="Miniaturas do produto"
                    className="flex snap-x snap-mandatory [scrollbar-width:none] gap-2.5 overflow-x-auto pb-1 lg:order-1 lg:max-h-[34rem] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0 [&::-webkit-scrollbar]:hidden"
                >
                    {images.map((image, index) => {
                        const isSelected = index === safeIndex;

                        return (
                            <button
                                key={image.id}
                                ref={(node) => {
                                    thumbnailRefs.current[index] = node;
                                }}
                                type="button"
                                onClick={() => selectImage(index)}
                                onKeyDown={(event) =>
                                    handleThumbnailKeyDown(event, index)
                                }
                                aria-label={`Ver imagem ${index + 1} de ${images.length}: ${image.alt || productName}`}
                                aria-current={isSelected ? 'true' : undefined}
                                className={cn(
                                    'relative aspect-square size-16 min-h-11 min-w-11 shrink-0 snap-start overflow-hidden rounded-md border bg-muted/40 transition-[border-color,box-shadow,opacity] duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none sm:size-20 lg:size-[5.25rem]',
                                    isSelected
                                        ? 'border-brand opacity-100 ring-2 ring-brand/30'
                                        : 'border-border opacity-75 hover:border-foreground/40 hover:opacity-100',
                                )}
                            >
                                <img
                                    src={image.url}
                                    srcSet={buildImageSrcSet(image)}
                                    sizes="84px"
                                    alt={
                                        image.alt ||
                                        `${productName} - miniatura ${index + 1}`
                                    }
                                    width={84}
                                    height={84}
                                    loading="lazy"
                                    decoding="async"
                                    className="size-full object-cover"
                                />
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Lightbox em tela cheia usando o Dialog existente (foco preso, Esc fecha) */}
            <Dialog open={lightboxOpen} onOpenChange={handleLightboxOpenChange}>
                <DialogContent
                    id={`${galleryId}-lightbox`}
                    onKeyDown={handleLightboxKeyDown}
                    className="fixed inset-0 top-0 left-0 z-50 flex h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background/98 p-0 shadow-none sm:max-w-none [&>button:last-child]:hidden"
                >
                    {/* Barra superior do Lightbox: título, controles de zoom (+/-/0) e botão fechar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5 pt-safe">
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="truncate text-sm font-semibold text-foreground sm:text-base">
                                {productName}
                            </DialogTitle>
                            <DialogDescription className="truncate text-xs text-muted-foreground">
                                Imagem {safeIndex + 1} de {images.length} · Use
                                a roda do mouse, pinça, duplo toque ou teclas +
                                / − / setas / 0
                            </DialogDescription>
                        </div>

                        <div
                            role="toolbar"
                            aria-label="Controles de zoom e fechamento"
                            className="flex items-center gap-1.5"
                        >
                            <StoreButton
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={scale <= MIN_ZOOM}
                                onClick={() => applyZoom(scale - ZOOM_STEP)}
                                aria-label="Diminuir zoom (tecla -)"
                            >
                                <Minus className="size-4" aria-hidden="true" />
                            </StoreButton>

                            <StoreButton
                                type="button"
                                variant="outline"
                                size="touch"
                                disabled={
                                    scale === MIN_ZOOM &&
                                    offset.x === 0 &&
                                    offset.y === 0
                                }
                                onClick={resetZoom}
                                aria-label={`Zoom atual ${zoomPercentage}%. Redefinir zoom (tecla 0)`}
                                className="min-w-20 px-2.5 font-mono text-xs tabular-nums"
                            >
                                <RotateCcw
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>{zoomPercentage}%</span>
                            </StoreButton>

                            <StoreButton
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={scale >= MAX_ZOOM}
                                onClick={() => applyZoom(scale + ZOOM_STEP)}
                                aria-label="Aumentar zoom (tecla +)"
                            >
                                <Plus className="size-4" aria-hidden="true" />
                            </StoreButton>

                            <DialogClose asChild>
                                <StoreButton
                                    type="button"
                                    variant="secondary"
                                    size="touch"
                                    aria-label="Fechar tela cheia (tecla Esc)"
                                    className="ml-1"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                    <span className="hidden sm:inline">
                                        Fechar
                                    </span>
                                </StoreButton>
                            </DialogClose>
                        </div>
                    </div>

                    {/* Área interativa de zoom (Pointer Events: pinça 2 dedos, duplo toque, arraste/pan e roda do mouse) */}
                    <div
                        ref={stageRef}
                        role="region"
                        aria-label={`Visualização ampliada: ${activeImage.alt || productName}`}
                        onWheel={handleWheel}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={finishPointerInteraction}
                        onPointerCancel={finishPointerInteraction}
                        className={cn(
                            'relative flex flex-1 touch-none items-center justify-center overflow-hidden bg-muted/30 select-none',
                            scale > MIN_ZOOM
                                ? isDragging
                                    ? 'cursor-grabbing'
                                    : 'cursor-grab'
                                : 'cursor-zoom-in',
                        )}
                    >
                        <img
                            src={activeImage.zoomUrl || activeImage.url}
                            srcSet={activeSrcSet}
                            sizes="100vw"
                            alt={activeImage.alt || productName}
                            width={1200}
                            height={1200}
                            draggable={false}
                            style={{
                                transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
                            }}
                            className={cn(
                                'max-h-[calc(100dvh-10rem)] max-w-[calc(100vw-2rem)] object-contain select-none',
                                !isDragging &&
                                    'transition-transform duration-150 ease-out motion-reduce:transition-none',
                            )}
                        />

                        {images.length > 1 && (
                            <>
                                <StoreButton
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => selectImage(safeIndex - 1)}
                                    aria-label="Imagem anterior"
                                    className="absolute top-1/2 left-3 z-10 -translate-y-1/2 bg-background/90 backdrop-blur-xs"
                                >
                                    <ChevronLeft
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </StoreButton>

                                <StoreButton
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => selectImage(safeIndex + 1)}
                                    aria-label="Próxima imagem"
                                    className="absolute top-1/2 right-3 z-10 -translate-y-1/2 bg-background/90 backdrop-blur-xs"
                                >
                                    <ChevronRight
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </StoreButton>
                            </>
                        )}
                    </div>

                    {/* Faixa inferior de miniaturas na tela cheia */}
                    {images.length > 1 && (
                        <div className="flex items-center justify-center gap-2 overflow-x-auto border-t border-border bg-card px-4 py-2.5 pb-safe">
                            {images.map((image, index) => {
                                const isSelected = index === safeIndex;

                                return (
                                    <button
                                        key={image.id}
                                        type="button"
                                        onClick={() => selectImage(index)}
                                        aria-label={`Selecionar imagem ${index + 1} de ${images.length}`}
                                        aria-current={
                                            isSelected ? 'true' : undefined
                                        }
                                        className={cn(
                                            'relative size-14 min-h-11 min-w-11 shrink-0 overflow-hidden rounded-md border bg-muted/40 transition-opacity duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                                            isSelected
                                                ? 'border-brand opacity-100 ring-2 ring-brand/30'
                                                : 'border-border opacity-70 hover:opacity-100',
                                        )}
                                    >
                                        <img
                                            src={image.url}
                                            alt={
                                                image.alt ||
                                                `${productName} - miniatura ${index + 1}`
                                            }
                                            width={56}
                                            height={56}
                                            loading="lazy"
                                            decoding="async"
                                            className="size-full object-cover"
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </section>
    );
}

export default ProductGallery;
