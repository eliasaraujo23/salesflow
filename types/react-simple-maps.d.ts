declare module 'react-simple-maps' {
  import { ComponentType, ReactNode, SVGProps, MouseEvent } from 'react';

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    children?: ReactNode;
  }

  interface GeographiesProps {
    geography: string | object;
    children: (props: { geographies: GeoFeature[] }) => ReactNode;
  }

  interface GeoFeature {
    rsmKey: string;
    properties: Record<string, string | number | undefined>;
  }

  interface GeographyProps extends SVGProps<SVGPathElement> {
    geography: GeoFeature;
    style?: { default?: React.CSSProperties; hover?: React.CSSProperties; pressed?: React.CSSProperties };
    onMouseEnter?: (e: MouseEvent<SVGPathElement>) => void;
    onMouseMove?: (e: MouseEvent<SVGPathElement>) => void;
    onMouseLeave?: (e: MouseEvent<SVGPathElement>) => void;
  }

  interface MarkerProps {
    coordinates: [number, number];
    children?: ReactNode;
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export const Marker: ComponentType<MarkerProps>;
}
