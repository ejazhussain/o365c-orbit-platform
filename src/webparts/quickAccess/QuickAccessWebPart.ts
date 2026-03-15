import * as React from 'react'
import * as ReactDom from 'react-dom'
import { Version } from '@microsoft/sp-core-library'
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane'
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base'

import QuickAccess, { IQuickAccessProps } from './components/QuickAccess'

export interface IQuickAccessWebPartProps {
  title: string
}

export default class QuickAccessWebPart extends BaseClientSideWebPart<IQuickAccessWebPartProps> {
  public render(): void {
    const element: React.ReactElement<IQuickAccessProps> = React.createElement(QuickAccess, {
      title: this.properties.title || 'Quick Access',
      spHttpClient: this.context.spHttpClient,
      webUrl: this.context.pageContext.web.absoluteUrl,
    })
    ReactDom.render(element, this.domElement)
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement)
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0')
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: 'Configure Quick Access' },
          groups: [
            {
              groupName: 'Settings',
              groupFields: [
                PropertyPaneTextField('title', { label: 'Title', value: 'Quick Access' }),
              ],
            },
          ],
        },
      ],
    }
  }
}
