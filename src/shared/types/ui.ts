export type UiWidgetType = 'label' | 'button' | 'image' | 'slot';

export interface UiWidget {
  id: string;
  type: UiWidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  texture?: string;
  action?: string;
}

export interface UiScreenModel {
  schemaVersion: '0.1.0';
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  widgets: UiWidget[];
  updatedAt: string;
}
