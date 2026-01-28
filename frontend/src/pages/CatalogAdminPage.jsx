import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  Building2,
  Globe,
  Percent,
  DollarSign,
  Package,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Calendar,
  RefreshCw,
  Trash2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API = process.env.REACT_APP_BACKEND_URL;

// Available suppliers
const SUPPLIERS = [
  { id: "fastenal", name: "Fastenal" },
  { id: "grainger", name: "Grainger" },
  { id: "motion", name: "Motion Industries" },
  { id: "msc", name: "MSC Industrial" },
  { id: "uline", name: "Uline" },
  { id: "other", name: "Other" },
];

// Available countries
const COUNTRIES = [
  { code: "USA", name: "United States" },
  { code: "Canada", name: "Canada" },
  { code: "Mexico", name: "Mexico" },
  { code: "Germany", name: "Germany" },
  { code: "UK", name: "United Kingdom" },
  { code: "France", name: "France" },
  { code: "India", name: "India" },
  { code: "China", name: "China" },
  { code: "Global", name: "Global (All Countries)" },
];

const CatalogAdminPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState("catalogs");
  const [loading, setLoading] = useState(false);
  const [catalogStats, setCatalogStats] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);

  // Upload form state
  const [catalogFile, setCatalogFile] = useState(null);
  const [contractFile, setContractFile] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedCountries, setSelectedCountries] = useState(["USA"]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Check admin access
  useEffect(() => {
    if (!user || user.role !== "admin") {
      toast.error("Admin access required");
      navigate("/catalog");
    }
  }, [user, navigate]);

  // Fetch data
  useEffect(() => {
    if (token && user?.role === "admin") {
      fetchCatalogStats();
      fetchContracts();
      fetchUploads();
    }
  }, [token, user]);

  const fetchCatalogStats = async () => {
    try {
      const response = await axios.get(`${API}/api/algolia/catalog/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCatalogStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await axios.get(`${API}/api/algolia/contracts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContracts(response.data.contracts || []);
    } catch (error) {
      console.error("Failed to fetch contracts:", error);
    }
  };

  const fetchUploads = async () => {
    try {
      const response = await axios.get(`${API}/api/algolia/catalog/uploads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUploads(response.data.uploads || []);
    } catch (error) {
      console.error("Failed to fetch uploads:", error);
    }
  };

  const handleCatalogUpload = async () => {
    if (!catalogFile || !selectedSupplier) {
      toast.error("Please select a file and supplier");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", catalogFile);
      formData.append("supplier", selectedSupplier);
      formData.append("countries", selectedCountries.join(","));

      const response = await axios.post(
        `${API}/api/algolia/catalog/upload-with-pricing`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percent);
          },
        }
      );

      toast.success(
        `Successfully indexed ${response.data.indexed_count} products from ${selectedSupplier}`
      );

      // Reset form
      setCatalogFile(null);
      setSelectedSupplier("");
      setUploadProgress(0);

      // Refresh data
      fetchCatalogStats();
      fetchUploads();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleContractUpload = async () => {
    if (!contractFile || !selectedSupplier) {
      toast.error("Please select a file and supplier");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", contractFile);
      formData.append("supplier_name", selectedSupplier);
      formData.append("countries", selectedCountries.join(","));

      const response = await axios.post(
        `${API}/api/algolia/contracts/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success(
        `Contract uploaded for ${selectedSupplier} with ${response.data.categories_count} categories`
      );

      // Reset form
      setContractFile(null);
      setSelectedSupplier("");

      // Refresh contracts
      fetchContracts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClearCatalog = async () => {
    if (!window.confirm("Are you sure you want to clear ALL products from the catalog? This cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${API}/api/algolia/catalog/clear`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Catalog cleared successfully");
      fetchCatalogStats();
      fetchUploads();
    } catch (error) {
      toast.error("Failed to clear catalog");
    } finally {
      setLoading(false);
    }
  };

  const viewContractDetails = async (supplierName) => {
    try {
      const response = await axios.get(
        `${API}/api/algolia/contracts/${encodeURIComponent(supplierName)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedContract(response.data);
    } catch (error) {
      toast.error("Failed to load contract details");
    }
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activePage="admin" />

      <main className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Catalog Administration</h1>
          <p className="text-slate-500 mt-1">
            Manage supplier contracts, upload catalogs, and configure pricing
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {catalogStats?.total_products?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-slate-500">Total Products</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {catalogStats?.supplier_count || 0}
                  </p>
                  <p className="text-xs text-slate-500">Suppliers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{contracts.length}</p>
                  <p className="text-xs text-slate-500">Active Contracts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Globe className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {catalogStats?.country_count || 0}
                  </p>
                  <p className="text-xs text-slate-500">Countries</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "catalogs" ? "default" : "outline"}
            onClick={() => setActiveTab("catalogs")}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Catalogs
          </Button>
          <Button
            variant={activeTab === "contracts" ? "default" : "outline"}
            onClick={() => setActiveTab("contracts")}
          >
            <Percent className="w-4 h-4 mr-2" />
            Manage Contracts
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            onClick={() => setActiveTab("history")}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Upload History
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === "catalogs" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Upload Product Catalog
                </CardTitle>
                <CardDescription>
                  Upload supplier catalog files (Excel) with automatic pricing calculation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Supplier Selection */}
                <div>
                  <Label>Supplier</Label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger data-testid="supplier-select">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIERS.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.name}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Country Selection */}
                <div>
                  <Label>Countries</Label>
                  <Select
                    value={selectedCountries[0]}
                    onValueChange={(val) => setSelectedCountries([val])}
                  >
                    <SelectTrigger data-testid="country-select">
                      <SelectValue placeholder="Select countries" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* File Upload */}
                <div>
                  <Label>Catalog File (Excel)</Label>
                  <div className="mt-2">
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => setCatalogFile(e.target.files[0])}
                      data-testid="catalog-file-input"
                    />
                    {catalogFile && (
                      <p className="text-sm text-slate-500 mt-1">
                        Selected: {catalogFile.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                {/* Upload Button */}
                <Button
                  className="w-full"
                  onClick={handleCatalogUpload}
                  disabled={loading || !catalogFile || !selectedSupplier}
                  data-testid="upload-catalog-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading & Indexing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload & Index Products
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Pricing Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Pricing Model
                </CardTitle>
                <CardDescription>
                  How Infosys pricing is calculated for catalog products
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">List Price (Catalog)</span>
                    <span className="font-mono text-sm">$100.00</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="text-sm">Category Discount (40%)</span>
                    <span className="font-mono text-sm">- $40.00</span>
                  </div>
                  <div className="border-t border-dashed pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Infosys Purchase Price</span>
                      <span className="font-mono text-sm">$60.00</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="text-sm">Margin ($40)</span>
                    <span className="text-xs">Infosys 30% / Customer 70%</span>
                  </div>
                  <div className="border-t border-dashed pt-2">
                    <div className="flex justify-between items-center text-green-600 font-medium">
                      <span>Customer Selling Price</span>
                      <span className="font-mono">$72.00</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Customer saves 28% off List Price
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Upload supplier contracts first to set category-level discounts.
                    Products without matching contracts use default discount rates.
                  </p>
                </div>

                {/* Clear Catalog */}
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleClearCatalog}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Entire Catalog
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "contracts" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contract Upload Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="w-5 h-5" />
                  Upload Supplier Contract
                </CardTitle>
                <CardDescription>
                  Upload category-level discount percentages from supplier contracts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Supplier</Label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIERS.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.name}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Contract File (Excel)</Label>
                  <p className="text-xs text-slate-500 mb-2">
                    File should have Category and Discount % columns
                  </p>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setContractFile(e.target.files[0])}
                    data-testid="contract-file-input"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleContractUpload}
                  disabled={loading || !contractFile || !selectedSupplier}
                  data-testid="upload-contract-btn"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Contract
                </Button>
              </CardContent>
            </Card>

            {/* Active Contracts List */}
            <Card>
              <CardHeader>
                <CardTitle>Active Contracts</CardTitle>
                <CardDescription>
                  Supplier contracts with category-level discounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contracts.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No contracts uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contracts.map((contract, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{contract.supplier_name}</p>
                          <p className="text-xs text-slate-500">
                            {contract.categories_count} categories •{" "}
                            {contract.countries?.join(", ")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewContractDetails(contract.supplier_name)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "history" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload History</CardTitle>
              <CardDescription>Recent catalog uploads and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Filename</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Countries</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No uploads yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    uploads.map((upload, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{upload.supplier}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {upload.filename}
                        </TableCell>
                        <TableCell>{upload.product_count?.toLocaleString()}</TableCell>
                        <TableCell>{upload.countries?.join(", ") || "USA"}</TableCell>
                        <TableCell>{upload.uploaded_by}</TableCell>
                        <TableCell>
                          {new Date(upload.uploaded_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              upload.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }
                          >
                            {upload.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Contract Details Modal */}
        <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedContract?.supplier_name} Contract Details
              </DialogTitle>
              <DialogDescription>
                Category-level discount percentages
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Discount %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedContract?.category_discounts &&
                    Object.entries(selectedContract.category_discounts).map(
                      ([category, discount]) => (
                        <TableRow key={category}>
                          <TableCell>{category}</TableCell>
                          <TableCell className="text-right font-mono">
                            {discount}%
                          </TableCell>
                        </TableRow>
                      )
                    )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedContract(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default CatalogAdminPage;
