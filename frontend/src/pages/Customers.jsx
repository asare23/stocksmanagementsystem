import MasterDataPage from '../components/MasterDataPage';

export default function Customers() {
  return (
    <MasterDataPage
      title="Customers"
      endpoint="/customers"
      columns={[
        { key: 'code', header: 'Code' },
        { key: 'name', header: 'Name' },
        { key: 'phone', header: 'Phone' },
        { key: 'customerType', header: 'Type' },
        { key: 'status', header: 'Status' },
      ]}
      fields={[
        { name: 'code', label: 'Customer Code', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'phone', label: 'Phone' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'address', label: 'Address', type: 'textarea' },
        {
          name: 'customerType', label: 'Customer Type', type: 'select',
          options: ['WALK_IN', 'INDIVIDUAL', 'RETAIL', 'WHOLESALE', 'CORPORATE'].map((v) => ({ value: v, label: v })),
        },
        { name: 'creditLimit', label: 'Credit Limit', type: 'number' },
        { name: 'paymentTerms', label: 'Payment Terms' },
      ]}
    />
  );
}
