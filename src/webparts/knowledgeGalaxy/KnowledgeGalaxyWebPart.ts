import * as React from "react";
import * as ReactDom from "react-dom";
import { Version } from "@microsoft/sp-core-library";
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle,
  PropertyPaneSlider,
} from "@microsoft/sp-property-pane";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";

import KnowledgeGalaxy from "./components/KnowledgeGalaxy";
import { IKnowledgeGalaxyProps } from "./components/IKnowledgeGalaxyProps";

export interface IKnowledgeGalaxyWebPartProps {
  title: string;
  siteUrl: string;
  maxDocuments: number;
  enableMockData: boolean;
  autoRotateSpeed: number;
}

export default class KnowledgeGalaxyWebPart extends BaseClientSideWebPart<IKnowledgeGalaxyWebPartProps> {
  public render(): void {
    const element: React.ReactElement<IKnowledgeGalaxyProps> =
      React.createElement(KnowledgeGalaxy, {
        title: this.properties.title || "",
        siteUrl:
          this.properties.siteUrl || this.context.pageContext.web.absoluteUrl,
        maxDocuments: this.properties.maxDocuments || 200,
        enableMockData: this.properties.enableMockData !== false,
        autoRotateSpeed: this.properties.autoRotateSpeed || 0.0001,
      });

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse("1.0");
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: "Configure your Knowledge Galaxy" },
          groups: [
            {
              groupName: "Galaxy Settings",
              groupFields: [
                PropertyPaneTextField("title", {
                  label: "Web part title",
                }),
                PropertyPaneTextField("siteUrl", {
                  label: "SharePoint site URL",
                  description: "Leave blank to use current site",
                }),
                PropertyPaneSlider("maxDocuments", {
                  label: "Maximum documents to load",
                  min: 50,
                  max: 500,
                  step: 50,
                  value: 200,
                  showValue: true,
                }),
                PropertyPaneToggle("enableMockData", {
                  label: "Use demo data",
                  onText: "Demo mode (no SharePoint needed)",
                  offText: "Live SharePoint data",
                }),
                PropertyPaneSlider("autoRotateSpeed", {
                  label: "Auto-rotate speed",
                  min: 0,
                  max: 5,
                  step: 0.5,
                  value: 1,
                  showValue: true,
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
