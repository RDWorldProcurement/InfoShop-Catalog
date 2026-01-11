import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import {
  Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle,
  Download, ShoppingCart, ArrowRight
} from "lucide-react";
import Sidebar from "../components/Sidebar";

const BulkUploadPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.csv')) {
      toast.error("Please upload an Excel (.xlsx) or CSV file");
      return;
    }
    setFile(selectedFile);
    setResults(null);
  };

  const uploadFile = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await axios.post(`${API}/bulk/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setResults(response.data);
      toast.success(`Processed ${response.data.total_items} items`);
    } catch (error) {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Create a simple template
    const template = "Product Name,Quantity\nSKF Ball Bearing 6205,10\n3M Safety Helmet,5\nBosch Cordless Drill,2";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activePage="bulk-upload" />

      <main className="flex-1 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              Bulk Upload
            </h1>
            <p className="text-slate-500 mt-1">Upload a list of products to search and order in bulk</p>
          </div>
          <Button 
            variant="outline"
            onClick={downloadTemplate}
            data-testid="download-template-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
        </div>

        {/* Upload Area */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div
              className={`dropzone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="upload-dropzone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInput}
                className="hidden"
                data-testid="file-input"
              />
              <FileSpreadsheet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              {file ? (
                <div>
                  <p className="text-lg font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-slate-700">
                    Drop your Excel file here or click to browse
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    Supported formats: .xlsx, .csv
                  </p>
                </div>
              )}
            </div>

            {file && (
              <div className="mt-6">
                {uploading ? (
                  <div>
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-sm text-slate-500 mt-2 text-center">
                      Processing... {uploadProgress}%
                    </p>
                  </div>
                ) : (
                  <Button 
                    onClick={uploadFile}
                    className="w-full bg-[#007CC3] hover:bg-[#00629B]"
                    data-testid="process-upload-btn"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Process File
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Upload Results</span>
                <div className="flex gap-4 text-sm font-normal">
                  <span className="text-green-600">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Found: {results.found_items}
                  </span>
                  <span className="text-red-600">
                    <XCircle className="w-4 h-4 inline mr-1" />
                    Not Found: {results.not_found_items}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Search Term</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Qty Requested</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.results?.map((item, idx) => (
                    <TableRow key={idx} data-testid={`result-row-${idx}`}>
                      <TableCell className="font-medium">{item.search_term}</TableCell>
                      <TableCell>
                        {item.found ? (
                          <Badge className="badge-success">Found</Badge>
                        ) : (
                          <Badge className="badge-error">Not Found</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.product ? (
                          <span className="text-sm">{item.product.name}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.product ? (
                          <span className="font-semibold">
                            {item.product.currency}{item.product.price?.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.requested_quantity}</TableCell>
                      <TableCell className="text-right">
                        {item.product ? (
                          <span className={item.product.available_quantity >= item.requested_quantity ? 'text-green-600' : 'text-orange-500'}>
                            {item.product.available_quantity}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.found ? (
                          <Button size="sm" className="bg-[#007CC3] hover:bg-[#00629B]">
                            <ShoppingCart className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline">
                            RFQ
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {results.found_items > 0 && (
                <div className="mt-6 flex justify-end gap-4">
                  <Button variant="outline">
                    Export Results
                  </Button>
                  <Button className="bg-[#FF6B00] hover:bg-[#E65000]">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add All Found Items to Cart
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-[#007CC3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#007CC3] font-bold">1</span>
                </div>
                <h4 className="font-medium mb-2">Prepare Your File</h4>
                <p className="text-sm text-slate-500">
                  Create an Excel file with product names and quantities
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-[#007CC3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#007CC3] font-bold">2</span>
                </div>
                <h4 className="font-medium mb-2">Upload & Process</h4>
                <p className="text-sm text-slate-500">
                  System searches and matches products with availability
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-[#007CC3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#007CC3] font-bold">3</span>
                </div>
                <h4 className="font-medium mb-2">Review & Order</h4>
                <p className="text-sm text-slate-500">
                  Add found items to cart or submit RFQ for unfound items
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BulkUploadPage;
