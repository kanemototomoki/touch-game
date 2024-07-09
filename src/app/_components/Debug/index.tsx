import { ComponentPropsWithoutRef, FC, memo } from "react";

type Props = {
  isDrawing: boolean;
  docX: number;
  docY: number;
  touchedElementId: string | null;
  initialTouchedElementId: string | null;
} & ComponentPropsWithoutRef<"div">;

export const Debug: FC<Props> = memo(
  ({ isDrawing, docX, docY, touchedElementId, initialTouchedElementId, ...rest }) => {
    return (
      <div {...rest}>
        <p>{isDrawing ? "Drawing" : "Not drawing"}</p>
        <p>
          docX: {docX} docY: {docY}
        </p>
        <p>Touched element ID: {touchedElementId || "None"}</p>
        <p>Initial touched element ID: {initialTouchedElementId || "None"}</p>
      </div>
    );
  }
);

Debug.displayName = "Debug";
