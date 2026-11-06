import MasterDataPage from '../components/MasterDataPage';

export default function Suppliers() {
  return (
    <MasterDataPage
      title="Suppliers"
      endpoint="/suppliers"
      columns={[
        { key: 'code', header: 'Code' },
        { key: 'name', header: 'Name' },
        { key: 'contactPerson', header: 'Contact' },
        { key: 'phone', header: 'Phone' },
        { key: 'paymentTerms', header: 'Terms' },
        { key: 'status', header: 'Status' },
      ]}
      fields={[
        { name: 'code', label: 'Supplier Code', required: true },
        { name: 'name', label: 'Supplier Name', required: true },
        { name: 'contactPerson', label: 'Contact Person' },
        { name: 'phone', label: 'Phone' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'address', label: 'Address', type: 'textarea' },
        { name: 'country', label: 'Country' },
        { name: 'taxId', label: 'Tax ID' },
        { name: 'paymentTerms', label: 'Payment Terms' },
        { name: 'creditLimit', label: 'Credit Limit', type: 'number' },
      ]}
    />
  );
}
