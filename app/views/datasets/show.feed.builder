xml.instruct! :xml, :version => "1.0" 
xml.feed :xmlns => "http://www.w3.org/2005/Atom", "xmlns:dc" => "http://purl.org/dc/elements/1.1/" do
  xml.author  do
    xml.name @dataset.user_full_name
  end
  xml.updated DateTime.parse(@dataset.updated_at.to_s).rfc3339
  xml.id dataset_url(@dataset, format: :feed)
  xml.title @dataset.title
  xml.link :href=> @dataset.documentation_url, :rel => "self"
  @dataset.certificates.where(published: true).by_newest.each do |certificate|
    xml.entry do
      xml.link :href=> dataset_certificate_url(@dataset, certificate)
      xml.title certificate.name
      xml.content certificate.attained_level_title
      xml.updated DateTime.parse(certificate.updated_at.to_s).rfc3339
      xml.id dataset_certificate_url(@dataset, certificate)
      xml.link :href => dataset_url(@dataset)
      xml.link :rel => "about", :href => @dataset.documentation_url
      xml.link :rel => "alternate", :type => "application/json", 
               :href => polymorphic_url([@dataset, certificate], :format => :json)
      xml.link :rel => "http://schema.theodi.org/certificate#badge", :type => "text/html",
               :href => badge_dataset_certificate_url(@dataset.id, certificate, :format => :html)
      xml.link :rel => "http://schema.theodi.org/certificate#badge", :type => "application/javascript",
               :href => badge_dataset_certificate_url(@dataset.id, certificate, :format => :js)
    end
  end
end