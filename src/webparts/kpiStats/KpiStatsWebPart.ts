import * as React from 'react'
import * as ReactDom from 'react-dom'
import { Version } from '@microsoft/sp-core-library'
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane'
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base'

import KpiStats, { IKpiStatsProps } from './components/KpiStats'

export interface IKpiStatsWebPartProps {
  stat1Value: string
  stat1Label: string
  stat2Value: string
  stat2Label: string
  stat3Value: string
  stat3Label: string
  stat4Value: string
  stat4Label: string
}

export default class KpiStatsWebPart extends BaseClientSideWebPart<IKpiStatsWebPartProps> {
  public render(): void {
    const element: React.ReactElement<IKpiStatsProps> = React.createElement(KpiStats, {
      stat1Value: this.properties.stat1Value || '2,847',
      stat1Label: this.properties.stat1Label || 'Documents',
      stat2Value: this.properties.stat2Value || '142',
      stat2Label: this.properties.stat2Label || 'Contributors',
      stat3Value: this.properties.stat3Value || '38',
      stat3Label: this.properties.stat3Label || 'Active Projects',
      stat4Value: this.properties.stat4Value || '96%',
      stat4Label: this.properties.stat4Label || 'Content Tagged',
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
          header: { description: 'Configure KPI Stats' },
          groups: [
            {
              groupName: 'Stat 1',
              groupFields: [
                PropertyPaneTextField('stat1Value', { label: 'Value', value: '2,847' }),
                PropertyPaneTextField('stat1Label', { label: 'Label', value: 'Documents' }),
              ],
            },
            {
              groupName: 'Stat 2',
              groupFields: [
                PropertyPaneTextField('stat2Value', { label: 'Value', value: '142' }),
                PropertyPaneTextField('stat2Label', { label: 'Label', value: 'Contributors' }),
              ],
            },
            {
              groupName: 'Stat 3',
              groupFields: [
                PropertyPaneTextField('stat3Value', { label: 'Value', value: '38' }),
                PropertyPaneTextField('stat3Label', { label: 'Label', value: 'Active Projects' }),
              ],
            },
            {
              groupName: 'Stat 4',
              groupFields: [
                PropertyPaneTextField('stat4Value', { label: 'Value', value: '96%' }),
                PropertyPaneTextField('stat4Label', { label: 'Label', value: 'Content Tagged' }),
              ],
            },
          ],
        },
      ],
    }
  }
}
