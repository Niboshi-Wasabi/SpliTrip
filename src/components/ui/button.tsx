"use client";

import * as React from "react";
import type { PressEvent } from "react-aria";
import { Button as HeroUIButton } from "@heroui/react";
import { cn } from "@/lib/utils";
import {
  isIconOnlyButtonSize,
  mapButtonSize,
  mapButtonVariant,
  type ShadcnButtonSize,
  type ShadcnButtonVariant,
} from "@/lib/ui/heroui-maps";

export { buttonVariants } from "./button-variants";

type HeroUIButtonProps = React.ComponentProps<typeof HeroUIButton>;

type ButtonProps = Omit<HeroUIButtonProps, "variant" | "size"> & {
  variant?: ShadcnButtonVariant;
  size?: ShadcnButtonSize;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  title?: string;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "default",
    size = "default",
    disabled,
    isDisabled,
    onClick,
    onPress,
    type = "button",
    children,
    ...props
  },
  reference,
) {
  const resolvedDisabled = isDisabled ?? disabled;

  const resolvedOnPress: ((event: PressEvent) => void) | undefined =
    onPress ??
    (onClick
      ? () => {
          onClick({} as React.MouseEvent<HTMLButtonElement>);
        }
      : undefined);

  return (
    <HeroUIButton
      ref={reference}
      type={type}
      variant={mapButtonVariant(variant)}
      size={mapButtonSize(size)}
      isIconOnly={isIconOnlyButtonSize(size)}
      isDisabled={resolvedDisabled}
      onPress={resolvedOnPress}
      className={cn(
        variant === "link" && "h-auto min-h-0 px-0 underline-offset-4 hover:underline",
        className,
      )}
      {...props}
    >
      {children}
    </HeroUIButton>
  );
});

export { Button };
