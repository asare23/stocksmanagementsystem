import { useState } from 'react';
import MasterDataPage from '../components/MasterDataPage';

export default function CategoriesBrands() {
  const [tab, setTab] = useState('categories');
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className={tab === 'categories' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('categories')}>Categories</button>
        <button className={tab === 'brands' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('brands')}>Brands</button>
      </div>
      {tab === 'categories' ? (
        <MasterDataPage
          title="Product Categories"
          endpoint="/categories"
          columns={[{ key: 'name', header: 'Name' }, { key: 'parentId', header: 'Parent ID' }]}
          fields={[{ name: 'name', label: 'Category Name', required: true }, { name: 'parentId', label: 'Parent Category ID (optional)' }]}
        />
      ) : (
        <MasterDataPage
          title="Brands"
          endpoint="/brands"
          columns={[{ key: 'name', header: 'Name' }]}
          fields={[{ name: 'name', label: 'Brand Name', required: true }]}
        />
      )}
    </div>
  );
}
