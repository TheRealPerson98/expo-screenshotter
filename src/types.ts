export interface ScreenSize {
  width: number;
  height: number;
  name: string;
  scrollY?: number;  // Vertical scroll position in pixels
  scrollX?: number;  // Horizontal scroll position in pixels
  fullPage?: boolean; // Whether to capture the full page height for this specific size
  useDeviceFrame?: boolean; // Whether to place the screenshot inside a device frame
  deviceType?: 'iphone' | 'android'; // Type of device frame to use
  iphoneOptions?: {
    pill?: boolean; // Whether to use pill-style iPhone (true) or notch-style (false)
    color?: 'Gold' | 'Space Black' | 'Silver' | 'Deep Purple' | 'Starlight' | 'Midnight' | 'Red' | 'Blue'; // iPhone color
    width?: number; // Target width for the final image (for resizing)
    height?: number; // Target height for the final image (for resizing)
  };
}

export interface View {
  name: string;
  path: string;
}

export interface ScreenshotConfig {
  views: View[];
  sizes: ScreenSize[];
  outputDir: string;
  expoUrl: string;
  waitForSelector?: string;
  waitTime?: number;
  fullPage?: boolean;  // Whether to capture the full page height (default for all sizes)
  useDeviceFrame?: boolean; // Whether to place screenshots inside device frames (default for all sizes)
  deviceType?: 'iphone' | 'android'; // Default device frame type to use
  iphoneOptions?: {
    pill?: boolean; // Whether to use pill-style iPhone (true) or notch-style (false)
    color?: 'Gold' | 'Space Black' | 'Silver' | 'Deep Purple' | 'Starlight' | 'Midnight' | 'Red' | 'Blue'; // iPhone color
    width?: number; // Target width for the final image (for resizing)
    height?: number; // Target height for the final image (for resizing)
  };
} 