import { Component, type ReactNode } from "react";
import { View } from "react-native";
import { withTranslation, type WithTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

type ErrorBoundaryProps = Props & WithTranslation;

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundaryComponent extends Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    const { t } = this.props;

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <View className="flex-1 items-center justify-center px-6 gap-4 bg-background">
          <Text className="text-lg font-semibold text-foreground">
            {t("somethingWentWrong")}
          </Text>
          <Text className="text-center text-sm text-muted-foreground">
            {this.state.error?.message ?? t("unexpectedError")}
          </Text>
          <Button variant="brand" size="pill" onPress={this.handleReload}>
            <Text>{t("tryAgain")}</Text>
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryComponent);
