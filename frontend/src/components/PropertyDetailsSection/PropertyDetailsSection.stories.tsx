import type { Meta, StoryObj } from '@storybook/react';
import { BrowserRouter } from 'react-router-dom';
import { DateProvider } from '@hooks/useDateContext';
import ReactMarkdown from 'react-markdown';
import PropertyDetailsSection from './PropertyDetailsSection';
import {
  OverviewSection,
  AttributesSection,
  PropertyValueSection,
  PropertyTaxesSection,
  AbatementsSection,
  ApprovedPermitsSection,
  ContactUsSection,
} from './index';

const meta: Meta = {
  title: 'Components/PropertyDetailsSection',
  component: OverviewSection,
  decorators: [
    (Story) => (
      <BrowserRouter>
        <DateProvider>
          <Story />
        </DateProvider>
      </BrowserRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Base story that will be used for all variants
const BaseStory: Story = {
  render: () => (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '40px', textAlign: 'center' }}>Property Details</h1>
      <div id="section-container" />
    </div>
  ),
};

// Create variants for each section
export const Overview: Story = {
  ...BaseStory,
  render: () => (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <OverviewSection 
        title="Property Overview"
        data={{
          fullAddress: "123 Beacon Street, Boston, MA 02116",
          owners: ["John Smith", "Jane Smith"],
          imageSrc: "https://placehold.co/512x512/e8f4f8/003c71?text=Property+Image",
          assessedValue: 1250000,
          propertyType: "102",
          propertyTypeDescription: "Condominium",
          parcelId: 1234567890,
          netTax: 12500,
          totalBilledAmount: 6250,
          personalExemptionAmount: 0,
          personalExemptionFlag: false,
          residentialExemptionAmount: 3716,
          residentialExemptionFlag: true,
          livingArea: 1800,
          landArea: 2500,
          yearBuilt: 2015,
          numberOfStories: 2,
        }}
      />
    </div>
  ),
};

export const Attributes: Story = {
  ...BaseStory,
  render: () => (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <AttributesSection 
        title="Property Attributes"
        data={{
          attributeGroups: [
            {
              title: 'Building Details',
              content: [
                { label: 'Property Type', value: 'Single Family' },
                { label: 'Year Built', value: '2015' },
                { label: 'Living Area', value: '2,500 sq ft' },
                { label: 'Lot Size', value: '3,500 sq ft' },
                { label: 'Number of Stories', value: '2' },
                { label: 'Style', value: 'Contemporary' },
                { label: 'Orientation', value: 'South' },
                { label: 'Building Type', value: 'Wood Frame' },
              ],
            },
            {
              title: 'Rooms',
              content: [
                {
                  title: 'Bedrooms',
                  content: [
                    { label: 'Number of Bedrooms', value: '4' },
                    { label: 'Bedroom Type', value: 'Master Suite' },
                    { label: 'Total Rooms', value: '8' },
                  ],
                },
                {
                  title: 'Bathrooms',
                  content: [
                    { label: 'Total Bathrooms', value: '3' },
                    { label: 'Half Bathrooms', value: '1' },
                    { label: 'Bath Style 1', value: 'Modern' },
                    { label: 'Bath Style 2', value: 'Traditional' },
                    { label: 'Bath Style 3', value: 'Contemporary' },
                  ],
                },
                {
                  title: 'Kitchen',
                  content: [
                    { label: 'Number of Kitchens', value: '1' },
                    { label: 'Kitchen Type', value: 'Gourmet' },
                    { label: 'Kitchen Style 1', value: 'Modern' },
                    { label: 'Kitchen Style 2', value: 'Open Concept' },
                    { label: 'Kitchen Style 3', value: 'Island' },
                  ],
                },
              ],
            },
            {
              title: 'Utilities & Features',
              content: [
                { label: 'Fireplaces', value: '2' },
                { label: 'AC Type', value: 'Central Air' },
                { label: 'Heat Type', value: 'Forced Air' },
                { label: 'Heat Fuel', value: 'Natural Gas' },
                { label: 'Basement', value: 'Finished' },
                { label: 'Attic', value: 'Finished' },
                { label: 'Patio', value: 'Yes' },
                { label: 'Deck', value: 'Yes' },
                { label: 'Porch', value: 'Front and Back' },
              ],
            },
            {
              title: 'Condition & Finish',
              content: [
                {
                  title: 'Interior',
                  content: [
                    { label: 'Condition', value: 'Excellent' },
                    { label: 'Finish', value: 'High End' },
                  ],
                },
                {
                  title: 'Exterior',
                  content: [
                    { label: 'Finish', value: 'Brick' },
                    { label: 'Condition', value: 'Good' },
                    { label: 'View', value: 'City Skyline' },
                    { label: 'Grade', value: 'A' },
                  ],
                },
              ],
            },
            {
              title: 'Construction',
              content: [
                { label: 'Roof Cover', value: 'Asphalt Shingle' },
                { label: 'Roof Structure', value: 'Gable' },
                { label: 'Foundation', value: 'Concrete' },
                { label: 'Land Use', value: 'Residential' },
              ],
            },
            {
              title: 'Parking',
              content: [
                { label: 'Parking Spots', value: '2' },
                { label: 'Ownership', value: 'Owned' },
                { label: 'Type', value: 'Garage' },
                { label: 'Tandem Parking', value: 'No' },
              ],
            },
            {
              title: 'Last Transaction',
              content: [
                { label: 'Sale Price', value: '$850,000' },
                { label: 'Sale Date', value: 'June 15, 2023' },
                { label: 'Registry Book & Page', value: 'Book 12345, Page 678' },
              ],
            },
          ],
        }}
      />
    </div>
  ),
};

export const PropertyValue: Story = {
  ...BaseStory,
  render: () => (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <PropertyValueSection 
        title="Property Value"
        historicPropertyValues={{
          2018: 425000,
          2019: 432000,
          2020: 445000,
          2021: 460000,
          2022: 478500,
          2023: 492000,
          2024: 510000,
          2025: 525000
        }}
      />
    </div>
  ),
};

export const PropertyTaxes: Story = {
  ...BaseStory,
  render: () => (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <PropertyTaxesSection
        title="Property Taxes"
        propertyGrossTax={9427.20}
        residentialExemptionAmount={3716.40}
        residentialExemptionFlag={true}
        personalExemptionAmount={0}
        personalExemptionFlag={false}
        communityPreservationAmount={94.27}
        propertyNetTax={5805.07}
        estimatedTotalFirstHalf={2902.54}
        totalBilledAmount={2902.54}
        parcelId="1234567890"
      />
    </div>
  ),
};

export const Abatements: Story = {
  ...BaseStory,
  render: () => {
    const abatementMessage = `An abatement is a reduction in the assessed value of a property. An abatement is granted when the property is determined to be:

- Overvalued
- Disproportionately assessed in relation to other properties
- Classified improperly
- Entitled to an exemption

The abatement application period for the current fiscal year is from **January 1st** through the **first Monday in February**. During this time, property owners can file an abatement application if they believe their property is overvalued.

[Learn more about property tax abatements](https://www.boston.gov/departments/assessing/how-appeal-your-property-value)

**Filing an Abatement**

You can file an abatement application using:
- [Online abatement filing system](https://www.boston.gov/departments/assessing/how-appeal-your-property-value)
- Paper forms available at the Assessing Department
- In person at City Hall

**What You'll Need**

When filing an abatement, be prepared to provide:
- Property information and parcel ID
- Evidence supporting your claim (comparable sales, property condition issues, etc.)
- Documentation of any errors in property classification or exemptions`;

    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <PropertyDetailsSection title="Abatements & Appeals">
          <div style={{ fontSize: '1rem', lineHeight: '1.5' }}>
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => (
                  <a
                    className="usa-link usa-link--external"
                    rel="noreferrer"
                    target="_blank"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul style={{ marginLeft: '20px', marginTop: '10px', marginBottom: '10px' }} {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li style={{ marginBottom: '5px' }} {...props} />
                ),
              }}
            >
              {abatementMessage}
            </ReactMarkdown>
          </div>
        </PropertyDetailsSection>
      </div>
    );
  },
};

export const ApprovedPermits: Story = {
  ...BaseStory,
  render: () => (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <ApprovedPermitsSection 
        parcelId="1234567890"
        title="Approved Building Permits"
      />
    </div>
  ),
};

export const ContactUs: Story = {
  ...BaseStory,
  render: () => (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <ContactUsSection 
        title="Contact Us"
      />
    </div>
  ),
}; 