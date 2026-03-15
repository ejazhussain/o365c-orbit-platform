import * as React from 'react'
import * as ReactDom from 'react-dom'
import { Version } from '@microsoft/sp-core-library'
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneSlider,
} from '@microsoft/sp-property-pane'
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base'

import LiveActivity, { ILiveActivityProps } from './components/LiveActivity'

export interface ILiveActivityWebPartProps {
  title: string
  maxItems: number
}

export default class LiveActivityWebPart extends BaseClientSideWebPart<ILiveActivityWebPartProps> {
  public render(): void {
    const element: React.ReactElement<ILiveActivityProps> = React.createElement(LiveActivity, {
      title: this.properties.title || 'Live Activity',
      maxItems: this.properties.maxItems || 5,
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
          header: { description: 'Configure Live Activity' },
          groups: [
            {
              groupName: 'Settings',
              groupFields: [
                PropertyPaneTextField('title', { label: 'Title', value: 'Live Activity' }),
                PropertyPaneSlider('maxItems', {
                  label: 'Max items',
                  min: 1,
                  max: 10,
                  value: 5,
                }),
              ],
            },
          ],
        },
      ],
    }
  }
}
